import { Router, Request, Response } from 'express';
import { authenticateToken, isPrivilegedRole, requireAdminRole } from '../middleware/auth';
import { supabaseAdmin, auditLog } from '../services/supabase';
import { payoutQueue, notificationQueue } from '../services/queue';
import { verifyCode } from '../utils/codes';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

const router = Router();

// POST /api/payouts/rider - Buyer pays rider (Buyer Step 2)
router.post('/rider', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { transaction_id, rider_momo_number, delivery_code } = req.body;
    const userId = req.user!.id;

    const { data: txn } = await supabaseAdmin
      .from('transactions').select('*').eq('id', transaction_id).single();
    if (!txn) { res.status(404).json({ error: 'Transaction not found' }); return; }
    if (txn.buyer_id !== userId && !isPrivilegedRole(req.user!.role)) {
      res.status(403).json({ error: 'Not your transaction' }); return;
    }

    const validStatuses = ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED_PENDING'];
    if (!validStatuses.includes(txn.status)) {
      res.status(400).json({ error: `Cannot pay rider in ${txn.status} status` }); return;
    }

    // Verify delivery code
    const { data: codes } = await supabaseAdmin
      .from('transaction_codes').select('*').eq('transaction_id', transaction_id).single();
    if (!codes) { res.status(400).json({ error: 'No codes found' }); return; }

    const valid = await verifyCode(delivery_code, codes.delivery_code_hash);
    if (!valid) { res.status(400).json({ error: 'Invalid delivery code' }); return; }

    const payoutAmount = txn.delivery_fee;
    const idempotencyKey = `rider_${transaction_id}_${uuidv4()}`;

    // Check for existing rider payout
    const { data: existingPayout } = await supabaseAdmin
      .from('payouts')
      .select('id, status')
      .eq('transaction_id', transaction_id)
      .eq('type', 'RIDER')
      .not('status', 'eq', 'FAILED')
      .limit(1);

    if (existingPayout && existingPayout.length > 0) {
      res.status(409).json({ error: 'Rider payout already exists', payout: existingPayout[0] }); return;
    }

    const { data: payout, error: payoutErr } = await supabaseAdmin
      .from('payouts')
      .insert({
        transaction_id,
        type: 'RIDER',
        amount: payoutAmount,
        destination: {
          type: 'mobile_money',
          name: txn.rider_name,
          account_number: rider_momo_number,
          bank_code: txn.rider_telco || 'MTN',
        },
        status: 'QUEUED',
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (payoutErr) throw payoutErr;

    await supabaseAdmin.from('transactions').update({
      rider_momo_number,
      status: 'DELIVERED_PENDING',
    }).eq('id', transaction_id);

    // Mark delivery code as verified
    await supabaseAdmin.from('transaction_codes').update({
      delivery_verified: true,
    }).eq('transaction_id', transaction_id);

    if (env.SIMULATION_MODE) {
      await supabaseAdmin.from('payouts').update({ status: 'SUCCESS' }).eq('id', payout.id);
    } else {
      await payoutQueue.add('rider_payout', {
        payout_id: payout.id,
        transaction_id,
        type: 'RIDER',
        amount: payoutAmount,
        destination: payout.destination,
        idempotency_key: idempotencyKey,
        reason: `Rider payout for ${txn.short_id}`,
      });
    }

    await auditLog({
      actor_id: userId, action: 'RIDER_PAYOUT_INITIATED',
      entity: 'payouts', entity_id: payout.id,
      after_state: { amount: payoutAmount, rider_momo: rider_momo_number },
      request_id: req.requestId,
    });
    await notificationQueue.add('send', {
      type: 'RIDER_PAYOUT_QUEUED',
      transaction_id,
      amount: payoutAmount,
      rider_phone: txn.rider_phone || rider_momo_number,
    });

    res.json({ data: { message: 'Rider payout queued', payout_id: payout.id } });
  } catch (err: any) {
    console.error('[RIDER_PAYOUT]', err.message);
    res.status(500).json({ error: 'Failed to initiate rider payout' });
  }
});

// POST /api/payouts/seller - Seller collects funds (Seller Step 2)
router.post('/seller', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { transaction_id, delivery_code, partial_code } = req.body;
    const userId = req.user!.id;

    const { data: txn } = await supabaseAdmin
      .from('transactions').select('*').eq('id', transaction_id).single();
    if (!txn) { res.status(404).json({ error: 'Transaction not found' }); return; }

    if (txn.seller_id !== userId && !isPrivilegedRole(req.user!.role)) {
      res.status(403).json({ error: 'Not your transaction' }); return;
    }
    if (txn.status !== 'DELIVERED_CONFIRMED') {
      res.status(400).json({ error: 'Delivery must be confirmed first' }); return;
    }

    const { data: codes } = await supabaseAdmin
      .from('transaction_codes').select('*').eq('transaction_id', transaction_id).single();
    if (!codes) { res.status(400).json({ error: 'No codes found' }); return; }

    const deliveryValid = await verifyCode(delivery_code, codes.delivery_code_hash);
    const partialValid = await verifyCode(partial_code, codes.partial_code_hash);
    if (!deliveryValid || !partialValid) {
      res.status(400).json({ error: 'Invalid codes' }); return;
    }

    // Check for existing seller payout
    const { data: existingPayout } = await supabaseAdmin
      .from('payouts')
      .select('id, status')
      .eq('transaction_id', transaction_id)
      .eq('type', 'SELLER')
      .not('status', 'eq', 'FAILED')
      .limit(1);

    if (existingPayout && existingPayout.length > 0) {
      res.status(409).json({ error: 'Seller payout already exists' }); return;
    }

    const sellerAmount = txn.product_total - txn.seller_platform_fee;
    const idempotencyKey = `seller_${transaction_id}_${uuidv4()}`;

    const { data: payout, error: payoutErr } = await supabaseAdmin
      .from('payouts')
      .insert({
        transaction_id,
        type: 'SELLER',
        amount: sellerAmount,
        destination: txn.seller_payout_destination,
        status: 'QUEUED',
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (payoutErr) throw payoutErr;

    // Credit platform fee to ledger
    await supabaseAdmin.from('ledger_entries').insert({
      transaction_id,
      bucket: 'PLATFORM',
      direction: 'CREDIT',
      amount: txn.seller_platform_fee,
      ref: idempotencyKey,
      description: 'Seller platform fee',
    });

    if (env.SIMULATION_MODE) {
      await supabaseAdmin.from('payouts').update({ status: 'SUCCESS' }).eq('id', payout.id);
    } else {
      await payoutQueue.add('seller_payout', {
        payout_id: payout.id,
        transaction_id,
        type: 'SELLER',
        amount: sellerAmount,
        destination: txn.seller_payout_destination,
        idempotency_key: idempotencyKey,
        reason: `Seller payout for ${txn.short_id}`,
      });
    }

    await supabaseAdmin.from('transactions').update({
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
    }).eq('id', transaction_id);

    await auditLog({
      actor_id: userId, action: 'SELLER_PAYOUT_INITIATED',
      entity: 'payouts', entity_id: payout.id,
      after_state: { amount: sellerAmount },
      request_id: req.requestId,
    });
    await notificationQueue.add('send', {
      type: 'SELLER_PAYOUT_QUEUED',
      transaction_id,
      amount: sellerAmount,
    });

    res.json({ data: { message: 'Seller payout queued', payout_id: payout.id, amount: sellerAmount } });
  } catch (err: any) {
    console.error('[SELLER_PAYOUT]', err.message);
    res.status(500).json({ error: 'Failed to initiate seller payout' });
  }
});

// GET /api/payouts - List payouts (admin)
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const page = (req.query.page as string) || '1';
    const limit = (req.query.limit as string) || '20';
    let query = supabaseAdmin.from('payouts').select('*, transactions(short_id, buyer_name, seller_name)', { count: 'exact' });

    if (!isPrivilegedRole(req.user!.role)) {
      const { data: txns } = await supabaseAdmin.from('transactions')
        .select('id').or(`buyer_id.eq.${req.user!.id},seller_id.eq.${req.user!.id}`);
      const txnIds = txns?.map(t => t.id) || [];
      query = query.in('transaction_id', txnIds);
    }

    if (status) query = query.eq('status', status as string);
    if (type) query = query.eq('type', type as string);

    const pageNum = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const from = (pageNum - 1) * pageSize;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    res.json({ data, total: count, page: pageNum, limit: pageSize });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list payouts' });
  }
});

// POST /api/payouts/:id/hold - Admin hold payout
router.post('/:id/hold', authenticateToken, requireAdminRole, async (req: Request, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    if (!reason) { res.status(400).json({ error: 'Reason is required' }); return; }

    const { data: payout } = await supabaseAdmin
      .from('payouts').select('*').eq('id', req.params.id).single();
    if (!payout) { res.status(404).json({ error: 'Payout not found' }); return; }

    await supabaseAdmin.from('payouts').update({
      status: 'HELD',
      held_reason: reason,
      held_by: req.user!.id,
    }).eq('id', payout.id);

    await auditLog({
      actor_id: req.user!.id, action: 'PAYOUT_HELD', entity: 'payouts', entity_id: payout.id,
      before_state: { status: payout.status }, after_state: { status: 'HELD', reason },
      request_id: req.requestId,
    });

    res.json({ data: { message: 'Payout held' } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to hold payout' });
  }
});

// POST /api/payouts/:id/release - Admin release held payout
router.post('/:id/release', authenticateToken, requireAdminRole, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: payout } = await supabaseAdmin
      .from('payouts').select('*').eq('id', req.params.id).single();
    if (!payout) { res.status(404).json({ error: 'Payout not found' }); return; }
    if (payout.status !== 'HELD') { res.status(400).json({ error: 'Payout is not held' }); return; }

    await supabaseAdmin.from('payouts').update({
      status: 'QUEUED', held_reason: null, held_by: null,
    }).eq('id', payout.id);

    await payoutQueue.add(`${payout.type.toLowerCase()}_payout`, {
      payout_id: payout.id,
      transaction_id: payout.transaction_id,
      type: payout.type,
      amount: payout.amount,
      destination: payout.destination,
      idempotency_key: payout.idempotency_key,
      reason: `Released payout`,
    });

    await auditLog({
      actor_id: req.user!.id, action: 'PAYOUT_RELEASED', entity: 'payouts', entity_id: payout.id,
      request_id: req.requestId,
    });

    res.json({ data: { message: 'Payout released and re-queued' } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to release payout' });
  }
});

// POST /api/payouts/:id/retry - Admin retry failed payout
router.post('/:id/retry', authenticateToken, requireAdminRole, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: payout } = await supabaseAdmin
      .from('payouts').select('*').eq('id', req.params.id).single();
    if (!payout) { res.status(404).json({ error: 'Payout not found' }); return; }
    if (payout.status !== 'FAILED') { res.status(400).json({ error: 'Only failed payouts can be retried' }); return; }

    await supabaseAdmin.from('payouts').update({
      status: 'QUEUED', attempts: 0, last_error: null,
    }).eq('id', payout.id);

    await payoutQueue.add(`${payout.type.toLowerCase()}_payout`, {
      payout_id: payout.id,
      transaction_id: payout.transaction_id,
      type: payout.type,
      amount: payout.amount,
      destination: payout.destination,
      idempotency_key: payout.idempotency_key,
      reason: 'Admin retry',
    });

    res.json({ data: { message: 'Payout retried' } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retry payout' });
  }
});

export default router;

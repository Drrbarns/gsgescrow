import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { supabaseAdmin, auditLog } from '../services/supabase';
import { CreateTransactionPayload, SellerDispatchPayload } from '../types';
import { generateCode, hashCode } from '../utils/codes';
import { env } from '../config/env';

const router = Router();

// POST /api/transactions - Create transaction (Buyer Step 1)
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const payload: CreateTransactionPayload = req.body;
    const buyerId = req.user!.id;

    const buyerFeePercent = 0.5;
    const sellerFeePercent = 0.75;
    const riderReleaseFee = 1.0;

    const buyerPlatformFee = parseFloat((payload.product_total * buyerFeePercent / 100).toFixed(2));
    const sellerPlatformFee = parseFloat((payload.product_total * sellerFeePercent / 100).toFixed(2));
    const grandTotal = payload.product_total + payload.delivery_fee + riderReleaseFee + buyerPlatformFee;

    const { data: txn, error } = await supabaseAdmin
      .from('transactions')
      .insert({
        buyer_id: buyerId,
        seller_phone: payload.seller_phone,
        seller_name: payload.seller_name,
        buyer_name: payload.buyer_name,
        buyer_phone: req.user!.phone,
        listing_link: payload.listing_link,
        source_platform: payload.source_platform,
        product_type: payload.product_type,
        product_name: payload.product_name,
        delivery_address: payload.delivery_address,
        delivery_date: payload.delivery_date,
        product_total: payload.product_total,
        delivery_fee: payload.delivery_fee,
        rider_release_fee: riderReleaseFee,
        buyer_platform_fee: buyerPlatformFee,
        seller_platform_fee: sellerPlatformFee,
        grand_total: grandTotal,
        status: 'SUBMITTED',
      })
      .select()
      .single();

    if (error) throw error;

    if (payload.refund_bank_details) {
      await supabaseAdmin
        .from('profiles')
        .update({ refund_bank_details: payload.refund_bank_details })
        .eq('user_id', buyerId);
    }

    await auditLog({
      actor_id: buyerId,
      action: 'TRANSACTION_CREATED',
      entity: 'transactions',
      entity_id: txn.id,
      after_state: { short_id: txn.short_id, grand_total: grandTotal },
      request_id: req.requestId,
    });

    res.status(201).json({ data: txn });
  } catch (err: any) {
    console.error('[CREATE_TXN]', err.message);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// GET /api/transactions - List transactions for current user
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const status = req.query.status as string | undefined;
    const platform = req.query.platform as string | undefined;
    const page = (req.query.page as string) || '1';
    const limit = (req.query.limit as string) || '20';
    const search = req.query.search as string | undefined;

    let query = supabaseAdmin.from('transactions').select('*', { count: 'exact' });

    if (role !== 'admin') {
      query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
    }
    if (status) query = query.eq('status', status as string);
    if (platform) query = query.eq('source_platform', platform as string);
    if (search) {
      query = query.or(
        `short_id.ilike.%${search}%,buyer_phone.ilike.%${search}%,seller_phone.ilike.%${search}%,product_name.ilike.%${search}%`
      );
    }

    const pageNum = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const from = (pageNum - 1) * pageSize;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    res.json({ data, total: count, page: pageNum, limit: pageSize });
  } catch (err: any) {
    console.error('[LIST_TXN]', err.message);
    res.status(500).json({ error: 'Failed to list transactions' });
  }
});

// GET /api/transactions/:id/simulation-delivery-code - In simulation mode, return fixed delivery code for testing
router.get('/:id/simulation-delivery-code', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  if (!env.SIMULATION_MODE) {
    res.status(404).json({ error: 'Not available' });
    return;
  }
  try {
    const { data: txn } = await supabaseAdmin
      .from('transactions')
      .select('id, buyer_id, status')
      .eq('id', req.params.id)
      .single();
    if (!txn || txn.buyer_id !== req.user!.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    if (txn.status !== 'PAID' && txn.status !== 'DISPATCHED' && txn.status !== 'IN_TRANSIT' && txn.status !== 'DELIVERED_PENDING') {
      res.status(400).json({ error: 'Transaction not in a state with delivery code' });
      return;
    }
    res.json({ data: { delivery_code: 'SIM0000' } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET /api/transactions/:id - Get single transaction
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: txn, error } = await supabaseAdmin
      .from('transactions')
      .select('*, payouts(*), ledger_entries(*), reviews(*)')
      .eq('id', req.params.id)
      .single();

    if (error || !txn) { res.status(404).json({ error: 'Transaction not found' }); return; }

    const userId = req.user!.id;
    const role = req.user!.role;
    if (role !== 'admin' && txn.buyer_id !== userId && txn.seller_id !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({ data: txn });
  } catch (err: any) {
    console.error('[GET_TXN]', err.message);
    res.status(500).json({ error: 'Failed to get transaction' });
  }
});

// POST /api/transactions/:id/dispatch - Seller dispatch (Seller Step 1)
router.post('/:id/dispatch', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const payload: SellerDispatchPayload = req.body;
    const sellerId = req.user!.id;

    const { data: txn, error: fetchErr } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !txn) { res.status(404).json({ error: 'Transaction not found' }); return; }
    if (txn.status !== 'PAID') { res.status(400).json({ error: 'Transaction must be in PAID status' }); return; }

    const sellerPhone = req.user!.phone;
    if (txn.seller_phone !== sellerPhone && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Phone does not match seller on transaction' }); return;
    }

    const partialCode = generateCode(4);
    const partialHash = await hashCode(partialCode);

    const { error: updateErr } = await supabaseAdmin
      .from('transactions')
      .update({
        seller_id: sellerId,
        status: 'DISPATCHED',
        dispatched_at: new Date().toISOString(),
        seller_business_location: payload.seller_business_location,
        rider_name: payload.rider_name,
        rider_phone: payload.rider_phone,
        rider_telco: payload.rider_telco,
        pickup_address: payload.pickup_address,
        additional_info: payload.additional_info,
        seller_payout_destination: payload.seller_payout_destination,
      })
      .eq('id', txn.id);

    if (updateErr) throw updateErr;

    await supabaseAdmin
      .from('transaction_codes')
      .update({
        partial_code_hash: partialHash,
        partial_code_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      })
      .eq('transaction_id', txn.id);

    await auditLog({
      actor_id: sellerId,
      action: 'TRANSACTION_DISPATCHED',
      entity: 'transactions',
      entity_id: txn.id,
      before_state: { status: txn.status },
      after_state: { status: 'DISPATCHED' },
      request_id: req.requestId,
    });

    res.json({ data: { partial_code: partialCode, message: 'Dispatch confirmed. Do NOT share partial code.' } });
  } catch (err: any) {
    console.error('[DISPATCH]', err.message);
    res.status(500).json({ error: 'Failed to dispatch' });
  }
});

// POST /api/transactions/:id/verify-delivery - Buyer confirms delivery
router.post('/:id/verify-delivery', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { delivery_code } = req.body;
    const txnId = req.params.id as string;

    const { data: txn } = await supabaseAdmin
      .from('transactions').select('*').eq('id', txnId).single();
    if (!txn) { res.status(404).json({ error: 'Not found' }); return; }
    if (txn.buyer_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' }); return;
    }

    const validStatuses = ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED_PENDING', 'REPLACEMENT_PENDING'];
    if (!validStatuses.includes(txn.status)) {
      res.status(400).json({ error: `Cannot verify delivery in ${txn.status} status` }); return;
    }

    const { data: codes } = await supabaseAdmin
      .from('transaction_codes').select('*').eq('transaction_id', txnId).single();
    if (!codes) { res.status(404).json({ error: 'Codes not found' }); return; }

    if (codes.delivery_locked_until && new Date(codes.delivery_locked_until) > new Date()) {
      res.status(429).json({ error: 'Too many attempts. Try again later.' }); return;
    }

    const { verifyCode } = await import('../utils/codes');
    const valid = await verifyCode(delivery_code, codes.delivery_code_hash);

    if (!valid) {
      const attempts = codes.delivery_attempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
      await supabaseAdmin.from('transaction_codes').update({
        delivery_attempts: attempts,
        delivery_locked_until: lockedUntil,
      }).eq('transaction_id', txnId);
      res.status(400).json({ error: 'Invalid delivery code', attempts_remaining: Math.max(0, 5 - attempts) });
      return;
    }

    await supabaseAdmin.from('transaction_codes').update({
      delivery_verified: true, delivery_attempts: 0,
    }).eq('transaction_id', txnId);

    await supabaseAdmin.from('transactions').update({
      status: 'DELIVERED_CONFIRMED',
      delivered_at: new Date().toISOString(),
    }).eq('id', txnId);

    await auditLog({
      actor_id: req.user!.id, action: 'DELIVERY_CONFIRMED',
      entity: 'transactions', entity_id: txnId, request_id: req.requestId,
    });

    res.json({ data: { message: 'Delivery confirmed successfully' } });
  } catch (err: any) {
    console.error('[VERIFY_DELIVERY]', err.message);
    res.status(500).json({ error: 'Failed to verify delivery' });
  }
});

// POST /api/transactions/:id/request-replacement - Buyer requests replacement
router.post('/:id/request-replacement', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: txn } = await supabaseAdmin
      .from('transactions').select('*').eq('id', req.params.id).single();
    if (!txn) { res.status(404).json({ error: 'Not found' }); return; }
    if (txn.buyer_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }
    if (txn.product_type === 'food') { res.status(400).json({ error: 'Food items cannot be replaced' }); return; }

    await supabaseAdmin.from('transactions').update({ status: 'REPLACEMENT_PENDING' }).eq('id', txn.id);

    await auditLog({
      actor_id: req.user!.id, action: 'REPLACEMENT_REQUESTED',
      entity: 'transactions', entity_id: txn.id, request_id: req.requestId,
    });

    res.json({ data: { message: 'Replacement requested' } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to request replacement' });
  }
});

// GET /api/transactions/track/:query - Public tracking
router.get('/track/:query', async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.params.query as string;
    let query = supabaseAdmin.from('transactions')
      .select('short_id, status, product_name, product_type, created_at, dispatched_at, delivered_at, completed_at');

    if (q.startsWith('SBS-')) {
      query = query.eq('short_id', q);
    } else {
      query = query.or(`buyer_phone.eq.${q},seller_phone.eq.${q}`);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(10);
    if (error) throw error;

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to track' });
  }
});

export default router;

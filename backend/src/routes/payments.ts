import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabaseAdmin, auditLog } from '../services/supabase';
import * as paystack from '../services/paystack';
import { generateCode, hashCode } from '../utils/codes';
import { notificationQueue } from '../services/queue';
import { env } from '../config/env';
import { scoreFraudRisk } from '../services/fraud';
import { createPaymentReceipt } from '../services/receipts';

const router = Router();

// POST /api/payments/initiate - Initiate Paystack payment for a transaction
router.post('/initiate', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { transaction_id } = req.body;
    const userId = req.user!.id;

    const { data: txn, error: txnErr } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (txnErr || !txn) { res.status(404).json({ error: 'Transaction not found' }); return; }
    if (txn.buyer_id !== userId) { res.status(403).json({ error: 'Not your transaction' }); return; }
    if (txn.status !== 'SUBMITTED') { res.status(400).json({ error: 'Transaction already paid or invalid status' }); return; }

    if (txn.paystack_reference) {
      res.json({
        data: {
          authorization_url: txn.paystack_authorization_url,
          access_code: txn.paystack_access_code,
          reference: txn.paystack_reference,
        },
      });
      return;
    }

    const reference = `SBS_${txn.short_id}_${Date.now()}`;
    const callbackUrl = `${env.APP_URL}/buyer/step-1?ref=${reference}&txn=${txn.id}`;

    const result = await paystack.initializePayment({
      amount: txn.grand_total,
      email: `${req.user!.phone}@sellbuysafe.gsgbrands.com.gh`,
      reference,
      callback_url: callbackUrl,
      metadata: {
        transaction_id: txn.id,
        short_id: txn.short_id,
        buyer_id: userId,
        custom_fields: [
          { display_name: 'Transaction ID', variable_name: 'transaction_id', value: txn.short_id },
        ],
      },
    });

    await supabaseAdmin.from('transactions').update({
      paystack_reference: reference,
      paystack_access_code: result.data.access_code,
      paystack_authorization_url: result.data.authorization_url,
    }).eq('id', txn.id);

    await auditLog({
      actor_id: userId,
      action: 'PAYMENT_INITIATED',
      entity: 'transactions',
      entity_id: txn.id,
      after_state: { reference, amount: txn.grand_total },
      request_id: req.requestId,
    });

    res.json({
      data: {
        authorization_url: result.data.authorization_url,
        access_code: result.data.access_code,
        reference,
      },
    });
  } catch (err: any) {
    console.error('[PAYMENT_INIT]', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// POST /api/payments/verify - Verify payment after redirect
router.post('/verify', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { reference } = req.body;

    const result = await paystack.verifyPayment(reference);

    if (result.data.status !== 'success') {
      res.status(400).json({ error: 'Payment not successful', status: result.data.status });
      return;
    }

    const txnId = result.data.metadata?.transaction_id;
    if (!txnId) { res.status(400).json({ error: 'No transaction ID in metadata' }); return; }

    const { data: txn } = await supabaseAdmin
      .from('transactions').select('status').eq('id', txnId).single();

    if (txn?.status === 'PAID') {
      res.json({ data: { message: 'Already processed', transaction_id: txnId } });
      return;
    }

    await processSuccessfulPayment(txnId, reference);

    res.json({ data: { message: 'Payment verified', transaction_id: txnId } });
  } catch (err: any) {
    console.error('[PAYMENT_VERIFY]', err.message);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

export async function processSuccessfulPayment(transactionId: string, reference: string) {
  const { data: txn } = await supabaseAdmin
    .from('transactions').select('*').eq('id', transactionId).single();

  if (!txn || txn.status === 'PAID') return;

  await supabaseAdmin.from('transactions').update({
    status: 'PAID',
    paid_at: new Date().toISOString(),
  }).eq('id', transactionId);

  // Create ledger credits
  const ledgerEntries = [
    { transaction_id: transactionId, bucket: 'PRODUCT' as const, direction: 'CREDIT' as const, amount: txn.product_total, ref: reference, description: 'Product funds secured with PSPs' },
    { transaction_id: transactionId, bucket: 'DELIVERY' as const, direction: 'CREDIT' as const, amount: txn.delivery_fee, ref: reference, description: 'Delivery fee secured with PSPs' },
    { transaction_id: transactionId, bucket: 'PLATFORM' as const, direction: 'CREDIT' as const, amount: txn.buyer_platform_fee, ref: reference, description: 'Buyer platform fee' },
    { transaction_id: transactionId, bucket: 'PLATFORM' as const, direction: 'CREDIT' as const, amount: txn.rider_release_fee, ref: reference, description: 'PSP transaction fee' },
  ];

  await supabaseAdmin.from('ledger_entries').insert(ledgerEntries);

  // Generate delivery code (fixed for simulation so buyer can use it)
  const isSimulation = reference.startsWith('SIM_');
  const deliveryCode = isSimulation ? 'SIM0000' : generateCode(7);
  const deliveryHash = await hashCode(deliveryCode);

  await supabaseAdmin.from('transaction_codes').insert({
    transaction_id: transactionId,
    delivery_code_hash: deliveryHash,
    delivery_code_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
  });

  await auditLog({
    action: 'PAYMENT_CONFIRMED',
    entity: 'transactions',
    entity_id: transactionId,
    after_state: { status: 'PAID', reference },
  });

  await notificationQueue.add('send', {
    type: 'PAYMENT_SUCCESS',
    transaction_id: transactionId,
  });

  // Score fraud risk in background
  scoreFraudRisk(transactionId).catch(err => console.error('[FRAUD_SCORE]', err.message));

  // Generate payment receipt
  createPaymentReceipt(transactionId).catch(err => console.error('[RECEIPT]', err.message));

  // Schedule auto-release window (24 hours)
  await supabaseAdmin.from('transactions').update({
    auto_release_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }).eq('id', transactionId);

  return deliveryCode;
}

// POST /api/payments/simulate - Mark transaction as PAID without Paystack (simulation mode only)
router.post('/simulate', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  if (!env.SIMULATION_MODE) {
    res.status(404).json({ error: 'Simulation not enabled' });
    return;
  }
  try {
    const { transaction_id } = req.body;
    const userId = req.user!.id;

    const { data: txn, error: txnErr } = await supabaseAdmin
      .from('transactions')
      .select('id, short_id, status, buyer_id')
      .eq('id', transaction_id)
      .single();

    if (txnErr || !txn) { res.status(404).json({ error: 'Transaction not found' }); return; }
    if (txn.buyer_id !== userId) { res.status(403).json({ error: 'Not your transaction' }); return; }
    if (txn.status !== 'SUBMITTED') { res.status(400).json({ error: 'Transaction already paid or invalid status' }); return; }

    const ref = `SIM_${txn.id}`;
    await processSuccessfulPayment(txn.id, ref);

    const { data: updated } = await supabaseAdmin.from('transactions').select('short_id').eq('id', txn.id).single();
    res.json({ data: { transaction_id: txn.id, short_id: updated?.short_id ?? txn.short_id, message: 'Simulated payment successful' } });
  } catch (err: any) {
    console.error('[PAYMENT_SIMULATE]', err.message);
    res.status(500).json({ error: 'Simulation failed' });
  }
});

export default router;

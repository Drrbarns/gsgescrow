import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabaseAdmin, auditLog } from '../services/supabase';
import * as paystack from '../services/paystack';
import * as moolre from '../services/moolre';
import { generateCode, hashCode } from '../utils/codes';
import { notificationQueue } from '../services/queue';
import { env } from '../config/env';
import { scoreFraudRisk } from '../services/fraud';
import { createPaymentReceipt } from '../services/receipts';

const router = Router();

function isMoolreReference(reference?: string) {
  return typeof reference === 'string' && reference.startsWith('MOO_');
}

function parseMoolreWebhook(body: any): { reference?: string; success: boolean; amount?: number } {
  const reference =
    body?.externalref ||
    body?.reference ||
    body?.data?.reference ||
    body?.data?.externalref ||
    body?.transaction_reference ||
    body?.txnref;

  const apiStatus = body?.status;
  const txStatus = body?.data?.txtstatus ?? body?.data?.status;
  const message = String(body?.message || '').toLowerCase();
  const txStatusStr = String(txStatus || '').toLowerCase();
  const apiOk = apiStatus === 1 || apiStatus === '1' || String(apiStatus || '').toLowerCase() === 'success';
  const txOk = txStatus === 1 || txStatus === '1' || ['success', 'successful', 'completed', 'paid'].includes(txStatusStr);
  const success = (apiOk || txOk) && !message.includes('fail') && !message.includes('error');

  const rawAmount = body?.data?.amount ?? body?.amount ?? body?.value;
  const amountNum = Number(rawAmount);
  const amount = Number.isFinite(amountNum) ? amountNum : undefined;

  return { reference, success, amount };
}

function parseMoolreStatusResponse(payload: any): { success: boolean; amount?: number } {
  const apiStatus = payload?.status;
  const txStatus = payload?.data?.txtstatus ?? payload?.data?.status;
  const message = String(payload?.message || '').toLowerCase();
  const txStatusStr = String(txStatus || '').toLowerCase();
  const apiOk = apiStatus === 1 || apiStatus === '1' || String(apiStatus || '').toLowerCase() === 'success';
  const txOk = txStatus === 1 || txStatus === '1' || ['success', 'successful', 'completed', 'paid'].includes(txStatusStr);
  const success = (apiOk || txOk) && !message.includes('fail') && !message.includes('error');

  const rawAmount = payload?.data?.amount ?? payload?.amount ?? payload?.data?.value;
  const amountNum = Number(rawAmount);
  const amount = Number.isFinite(amountNum) ? amountNum : undefined;

  return { success, amount };
}

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

    const preferMoolre = env.PAYMENT_PROVIDER === 'moolre' && moolre.isMoolreConfigured();
    const reference = `${preferMoolre ? 'MOO' : 'SBS'}_${txn.short_id}_${Date.now()}`;
    const redirectUrl = `${env.APP_URL}/buyer/step-1?ref=${reference}&txn=${txn.id}&provider=${preferMoolre ? 'moolre' : 'paystack'}`;
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0]?.trim();
    const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0]?.trim();
    const requestProto = forwardedProto || req.protocol;
    const requestHost = forwardedHost || req.get('host') || '';
    const detectedApiBase = requestHost ? `${requestProto}://${requestHost}` : '';
    const apiBase = (env.API_PUBLIC_URL || detectedApiBase || env.APP_URL).replace(/\/+$/, '');
    const callbackUrl = `${apiBase}/api/payments/moolre/webhook`;

    let authorizationUrl = '';
    let accessCode: string | null = null;
    let provider: 'moolre' | 'paystack' = 'paystack';

    if (preferMoolre) {
      const result = await moolre.generatePaymentLink({
        amount: txn.grand_total,
        externalref: reference,
        callback: callbackUrl,
        redirect: redirectUrl,
        metadata: {
          transaction_id: txn.id,
          short_id: txn.short_id,
          buyer_id: userId,
        },
      });
      authorizationUrl = result?.data?.authorization_url;
      provider = 'moolre';
    } else {
      const result = await paystack.initializePayment({
        amount: txn.grand_total,
        email: `${req.user!.phone}@sellbuysafe.gsgbrands.com`,
        reference,
        callback_url: redirectUrl,
        metadata: {
          transaction_id: txn.id,
          short_id: txn.short_id,
          buyer_id: userId,
          custom_fields: [
            { display_name: 'Transaction ID', variable_name: 'transaction_id', value: txn.short_id },
          ],
        },
      });
      authorizationUrl = result.data.authorization_url;
      accessCode = result.data.access_code;
      provider = 'paystack';
    }

    if (!authorizationUrl) {
      throw new Error('Payment provider did not return authorization_url');
    }

    await supabaseAdmin.from('transactions').update({
      paystack_reference: reference,
      paystack_access_code: accessCode,
      paystack_authorization_url: authorizationUrl,
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
        authorization_url: authorizationUrl,
        access_code: accessCode,
        reference,
        provider,
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
    if (isMoolreReference(reference)) {
      const { data: txn } = await supabaseAdmin
        .from('transactions')
        .select('id, status, grand_total')
        .eq('paystack_reference', reference)
        .single();

      if (!txn) {
        res.status(404).json({ error: 'Transaction not found for reference' });
        return;
      }

      if (txn.status === 'PAID') {
        res.json({ data: { message: 'Payment verified', transaction_id: txn.id } });
        return;
      }

      try {
        const statusPayload = await moolre.getPaymentStatus(reference);
        const providerCheck = parseMoolreStatusResponse(statusPayload);
        if (providerCheck.success) {
          if (typeof providerCheck.amount === 'number' && Math.abs(providerCheck.amount - Number(txn.grand_total || 0)) > 0.01) {
            res.status(400).json({ error: 'Payment amount mismatch' });
            return;
          }
          await processSuccessfulPayment(txn.id, reference);
          res.json({ data: { message: 'Payment verified', transaction_id: txn.id } });
          return;
        }
      } catch (moolreErr: any) {
        console.warn('[PAYMENT_VERIFY][MOOLRE_STATUS]', moolreErr?.message || 'status check failed');
      }

      res.status(202).json({ data: { message: 'Payment pending confirmation', transaction_id: txn.id, pending: true } });
      return;
    }

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

router.post('/moolre/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const configuredSecret = env.MOOLRE_CALLBACK_SECRET;
    const incomingSecret = req.body?.secret;
    if (configuredSecret && incomingSecret !== configuredSecret) {
      res.status(403).json({ message: 'Invalid callback signature' });
      return;
    }

    const { reference, success, amount } = parseMoolreWebhook(req.body);
    if (!reference) {
      res.status(200).json({ message: 'Missing reference acknowledged' });
      return;
    }

    const { data: txn } = await supabaseAdmin
      .from('transactions')
      .select('id, status, grand_total')
      .eq('paystack_reference', reference)
      .single();

    if (!txn) {
      res.status(200).json({ message: 'Unknown reference acknowledged' });
      return;
    }

    if (success && txn.status !== 'PAID') {
      if (typeof amount === 'number' && Math.abs(amount - Number(txn.grand_total || 0)) > 0.01) {
        res.status(200).json({ message: 'Amount mismatch acknowledged' });
        return;
      }
      await processSuccessfulPayment(txn.id, reference);
    }

    await auditLog({
      action: 'WEBHOOK_MOOLRE_PAYMENT',
      entity: 'webhooks',
      entity_id: txn.id,
      reason: reference,
      after_state: { success },
      request_id: req.requestId,
    });

    res.status(200).json({ message: 'Webhook processed' });
  } catch (err: any) {
    console.error('[MOOLRE_WEBHOOK]', err.message);
    res.status(200).json({ message: 'Webhook acknowledged with error' });
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

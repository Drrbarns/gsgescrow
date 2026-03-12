import { Router, Request, Response } from 'express';
import { verifyWebhookSignature } from '../services/paystack';
import { supabaseAdmin, auditLog } from '../services/supabase';
import { processSuccessfulPayment } from './payments';

const router = Router();

// Paystack sends raw body; we need to parse it ourselves
router.post('/paystack', async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      console.warn('[WEBHOOK] Invalid signature');
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    const event = req.body;
    const eventType = event.event;
    const reference = event.data?.reference;

    console.log(`[WEBHOOK] ${eventType} ref=${reference}`);

    // Idempotency: check if we've already processed this event
    const { data: existing } = await supabaseAdmin
      .from('audit_logs')
      .select('id')
      .eq('action', `WEBHOOK_${eventType}`)
      .eq('reason', reference)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[WEBHOOK] Already processed ${eventType} ${reference}`);
      res.status(200).json({ message: 'Already processed' });
      return;
    }

    switch (eventType) {
      case 'charge.success': {
        const txnId = event.data.metadata?.transaction_id;
        if (txnId) {
          await processSuccessfulPayment(txnId, reference);
        }
        break;
      }

      case 'transfer.success': {
        await supabaseAdmin
          .from('payouts')
          .update({
            status: 'SUCCESS',
            provider_ref: reference,
            completed_at: new Date().toISOString(),
          })
          .or(`provider_ref.eq.${reference},idempotency_key.ilike.%${reference}%`);
        break;
      }

      case 'transfer.failed':
      case 'transfer.reversed': {
        const { data: payout } = await supabaseAdmin
          .from('payouts')
          .select('id')
          .or(`provider_ref.eq.${reference},idempotency_key.ilike.%${reference}%`)
          .single();

        if (payout) {
          await supabaseAdmin
            .from('payouts')
            .update({
              status: 'FAILED',
              last_error: event.data.reason || eventType,
            })
            .eq('id', payout.id);
        }
        break;
      }
    }

    await auditLog({
      action: `WEBHOOK_${eventType}`,
      entity: 'webhooks',
      reason: reference,
      after_state: { event_type: eventType, reference },
    });

    res.status(200).json({ message: 'Webhook processed' });
  } catch (err: any) {
    console.error('[WEBHOOK_ERROR]', err.message);
    res.status(200).json({ message: 'Acknowledged with error' });
  }
});

export default router;

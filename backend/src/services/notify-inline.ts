import { supabaseAdmin } from './supabase';
import * as moolre from './moolre';

interface NotificationMessage {
  user_id: string | null;
  phone?: string;
  title: string;
  body: string;
}

export async function sendInlineNotification(type: string, transactionId: string) {
  const { data: txn } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (!txn) return;

  const messages: NotificationMessage[] = [];

  switch (type) {
    case 'TRANSACTION_CREATED':
      messages.push({
        user_id: txn.buyer_id,
        phone: txn.buyer_phone,
        title: 'Order Created',
        body: `Your transaction ${txn.short_id} was created successfully. Complete payment to secure funds.`,
      });
      if (txn.seller_phone) {
        messages.push({
          user_id: txn.seller_id || null,
          phone: txn.seller_phone,
          title: 'New Buyer Request',
          body: `A buyer created transaction ${txn.short_id}. You will be notified once payment is confirmed.`,
        });
      }
      break;
    case 'PAYMENT_SUCCESS':
      messages.push({
        user_id: txn.buyer_id,
        phone: txn.buyer_phone,
        title: 'Payment Confirmed',
        body: `Your payment for transaction ${txn.short_id} has been confirmed. Your seller has been notified.`,
      });
      if (txn.seller_phone) {
        messages.push({
          user_id: txn.seller_id,
          phone: txn.seller_phone,
          title: 'New Order Received',
          body: `A buyer has paid for transaction ${txn.short_id}. Please log in to accept and dispatch.`,
        });
      }
      break;
    case 'DISPATCHED':
      messages.push({
        user_id: txn.buyer_id,
        phone: txn.buyer_phone,
        title: 'Order Dispatched',
        body: `Your order ${txn.short_id} has been dispatched! You will receive a delivery code shortly.`,
      });
      break;
    case 'DELIVERY_CONFIRMED':
      if (txn.seller_phone) {
        messages.push({
          user_id: txn.seller_id,
          phone: txn.seller_phone,
          title: 'Delivery Confirmed',
          body: `Buyer confirmed delivery for ${txn.short_id}. Payout will be processed shortly.`,
        });
      }
      break;
    default:
      break;
  }

  for (const msg of messages) {
    const ref = `sms_${transactionId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let channel: 'LOG' | 'SMS' = 'LOG';
    let status = 'SENT';
    let metadata: Record<string, unknown> = { type, transaction_id: transactionId };

    try {
      if (msg.phone && moolre.isMoolreSmsConfigured()) {
        const smsRes = await moolre.sendSmsPost({
          messages: [{ recipient: msg.phone, message: `${msg.title}: ${msg.body}`.slice(0, 450), ref }],
        });
        const smsSuccess = smsRes?.status === 1 || smsRes?.status === '1' || smsRes?.code === 'SMS01';
        channel = 'SMS';
        status = smsSuccess ? 'SENT' : 'FAILED';
        metadata = { ...metadata, sms_ref: ref, sms_code: smsRes?.code, sms_raw: smsRes };
      } else {
        metadata = { ...metadata, sms_skipped: true, reason: 'Moolre SMS not configured or phone missing' };
      }
    } catch (smsErr: any) {
      channel = 'SMS';
      status = 'FAILED';
      metadata = { ...metadata, sms_ref: ref, sms_error: smsErr?.message || 'SMS send failed' };
    }

    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: msg.user_id,
        phone: msg.phone,
        channel,
        title: msg.title,
        body: msg.body,
        status,
        sent_at: status === 'SENT' ? new Date().toISOString() : null,
        metadata,
      });
    } catch { /* best-effort */ }
  }
}

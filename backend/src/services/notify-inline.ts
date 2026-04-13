import { supabaseAdmin } from './supabase';
import * as moolre from './moolre';

interface NotificationMessage {
  user_id: string | null;
  phone?: string;
  title: string;
  body: string;
}

function normalizePhone(raw?: string | null): string | undefined {
  const input = String(raw || '').trim();
  if (!input) return undefined;

  const keepPlus = input.startsWith('+');
  const digits = input.replace(/\D/g, '');
  if (!digits) return undefined;

  if (keepPlus) return `+${digits}`;
  if (digits.startsWith('233') && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length >= 10) return `+233${digits.slice(1)}`;
  if (digits.length === 9) return `+233${digits}`;
  return keepPlus ? `+${digits}` : digits;
}

async function resolvePhone(userId: string | null, fallbackPhone?: string): Promise<string | undefined> {
  const normalizedFallback = normalizePhone(fallbackPhone);
  if (normalizedFallback) return normalizedFallback;
  if (!userId) return undefined;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('phone')
    .eq('user_id', userId)
    .single();

  return normalizePhone(profile?.phone);
}

export async function sendInlineNotification(type: string, entityId: string, extra: Record<string, any> = {}) {
  const messages: NotificationMessage[] = [];

  // Transaction-based types: look up the transaction
  const txnTypes = [
    'TRANSACTION_CREATED', 'PAYMENT_SUCCESS', 'DISPATCHED', 'DELIVERY_CONFIRMED',
    'REPLACEMENT_REQUESTED', 'RIDER_PAYOUT_QUEUED', 'SELLER_PAYOUT_QUEUED',
    'PAYOUT_SUCCESS', 'DISPUTE_OPENED', 'DISPUTE_RESOLVED',
    'REVIEW_SUBMITTED', 'REVIEW_MODERATED',
  ];

  let txn: any = null;
  if (txnTypes.includes(type) && entityId) {
    const { data } = await supabaseAdmin
      .from('transactions')
      .select('buyer_id, seller_id, buyer_phone, seller_phone, rider_phone, buyer_name, seller_name, short_id')
      .eq('id', entityId)
      .single();
    txn = data;
  }

  switch (type) {
    case 'TRANSACTION_CREATED':
      if (!txn) break;
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
      if (!txn) break;
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
      if (!txn) break;
      messages.push({
        user_id: txn.buyer_id,
        phone: txn.buyer_phone,
        title: 'Order Dispatched',
        body: `Your order ${txn.short_id} has been dispatched by ${txn.seller_name || 'the seller'}.`,
      });
      break;

    case 'DELIVERY_CONFIRMED':
      if (!txn) break;
      if (txn.seller_phone) {
        messages.push({
          user_id: txn.seller_id,
          phone: txn.seller_phone,
          title: 'Delivery Confirmed',
          body: `Buyer confirmed delivery for ${txn.short_id}. You can now collect your payout.`,
        });
      }
      break;

    case 'REPLACEMENT_REQUESTED':
      if (!txn) break;
      if (txn.seller_phone) {
        messages.push({
          user_id: txn.seller_id,
          phone: txn.seller_phone,
          title: 'Replacement Requested',
          body: `Buyer requested a replacement for ${txn.short_id}. Please review and take action.`,
        });
      }
      break;

    case 'RIDER_PAYOUT_QUEUED':
      if (!txn) break;
      messages.push({
        user_id: txn.buyer_id,
        phone: txn.buyer_phone,
        title: 'Rider Payout Queued',
        body: `Rider payout for ${txn.short_id} has been queued.`,
      });
      if (txn.rider_phone || extra.rider_phone) {
        messages.push({
          user_id: null,
          phone: txn.rider_phone || extra.rider_phone,
          title: 'Delivery Payout Incoming',
          body: `Your payout for delivery on ${txn.short_id} is being processed.`,
        });
      }
      break;

    case 'SELLER_PAYOUT_QUEUED':
      if (!txn) break;
      if (txn.seller_phone) {
        messages.push({
          user_id: txn.seller_id,
          phone: txn.seller_phone,
          title: 'Seller Payout Queued',
          body: `Your payout for ${txn.short_id} has been queued for processing.`,
        });
      }
      break;

    case 'PAYOUT_SUCCESS':
      if (!txn) break;
      messages.push({
        user_id: null,
        phone: extra.payout_type === 'RIDER' ? txn.buyer_phone : txn.seller_phone,
        title: 'Payout Sent',
        body: `GHS ${extra.amount || ''} payout for ${txn.short_id} has been processed.`,
      });
      break;

    case 'DISPUTE_OPENED':
      if (!txn) break;
      messages.push({
        user_id: txn.buyer_id, phone: txn.buyer_phone,
        title: 'Dispute Opened', body: `A dispute has been opened for ${txn.short_id}.`,
      });
      if (txn.seller_phone) {
        messages.push({
          user_id: txn.seller_id, phone: txn.seller_phone,
          title: 'Dispute Opened', body: `A dispute has been opened for ${txn.short_id}. Our team will review it.`,
        });
      }
      break;

    case 'DISPUTE_RESOLVED':
      if (!txn) break;
      messages.push({
        user_id: txn.buyer_id, phone: txn.buyer_phone,
        title: 'Dispute Resolved',
        body: `Dispute on ${txn.short_id} resolved with action: ${extra.resolution_action || 'N/A'}.`,
      });
      if (txn.seller_phone) {
        messages.push({
          user_id: txn.seller_id, phone: txn.seller_phone,
          title: 'Dispute Resolved',
          body: `Dispute on ${txn.short_id} resolved with action: ${extra.resolution_action || 'N/A'}.`,
        });
      }
      break;

    case 'REVIEW_SUBMITTED':
      if (!txn) break;
      if (txn.seller_phone) {
        messages.push({
          user_id: txn.seller_id, phone: txn.seller_phone,
          title: 'New Review Received', body: `A buyer submitted a review for ${txn.short_id}.`,
        });
      }
      break;

    case 'REVIEW_MODERATED':
      if (!txn) break;
      messages.push({
        user_id: txn.buyer_id, phone: txn.buyer_phone,
        title: 'Review Moderated',
        body: `Your review for ${txn.short_id} was ${String(extra.status || 'updated').toLowerCase()}.`,
      });
      break;

    case 'KYC_SUBMITTED': {
      const { data: admins } = await supabaseAdmin
        .from('profiles')
        .select('user_id, phone')
        .in('role', ['admin', 'superadmin']);
      for (const admin of admins || []) {
        if (admin.phone) {
          messages.push({
            user_id: admin.user_id,
            phone: admin.phone,
            title: 'New KYC Submission',
            body: `${extra.applicant_role || 'User'} submitted KYC. Open admin verifications to review.`,
          });
        }
      }
      break;
    }

    case 'KYC_STATUS_CHANGED':
      if (extra.target_phone) {
        messages.push({
          user_id: extra.target_user_id || null,
          phone: extra.target_phone,
          title: 'KYC Status Updated',
          body: `Your KYC status is now ${extra.status || 'updated'}. ${extra.reason ? `Reason: ${extra.reason}` : ''}`,
        });
      }
      break;

    case 'LISTING_CREATED':
    case 'LISTING_UPDATED':
    case 'LISTING_PUBLISHED': {
      const targetUserId = extra.target_user_id as string | undefined;
      if (!targetUserId) break;
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('user_id, phone')
        .eq('user_id', targetUserId)
        .single();
      if (!profile?.phone) break;
      messages.push({
        user_id: profile.user_id,
        phone: profile.phone,
        title: type === 'LISTING_CREATED' ? 'Listing Created' : type === 'LISTING_PUBLISHED' ? 'Listing Published' : 'Listing Updated',
        body: `Your listing "${String(extra.listing_title || 'Untitled')}" is now ${String(extra.listing_status || 'UPDATED')}.`,
      });
      break;
    }

    case 'ADMIN_IMPERSONATION_STARTED':
    case 'ADMIN_IMPERSONATION_STOPPED':
      if (extra.actor_phone) {
        messages.push({
          user_id: extra.actor_id || null,
          phone: extra.actor_phone,
          title: type === 'ADMIN_IMPERSONATION_STARTED' ? 'Impersonation Started' : 'Impersonation Ended',
          body: String(extra.message || 'Admin impersonation session updated'),
        });
      }
      break;

    default:
      break;
  }

  for (const msg of messages) {
    const ref = `sms_${entityId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const recipient = await resolvePhone(msg.user_id, msg.phone);
    let channel: 'LOG' | 'SMS' = 'LOG';
    let status = 'SENT';
    let metadata: Record<string, unknown> = { type, entity_id: entityId };

    try {
      if (recipient && moolre.isMoolreSmsConfigured()) {
        const smsRes = await moolre.sendSmsPost({
          messages: [{ recipient, message: `${msg.title}: ${msg.body}`.slice(0, 450), ref }],
        });
        const smsSuccess = smsRes?.status === 1 || smsRes?.status === '1' || smsRes?.code === 'SMS01';
        channel = 'SMS';
        status = smsSuccess ? 'SENT' : 'FAILED';
        metadata = { ...metadata, sms_ref: ref, sms_code: smsRes?.code, sms_raw: smsRes, recipient };
      } else {
        metadata = {
          ...metadata,
          sms_skipped: true,
          reason: 'Moolre SMS not configured or phone missing',
          recipient_missing: !recipient,
        };
      }
    } catch (smsErr: any) {
      channel = 'SMS';
      status = 'FAILED';
      metadata = { ...metadata, sms_ref: ref, sms_error: smsErr?.message || 'SMS send failed', recipient };
    }

    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: msg.user_id,
        phone: recipient || msg.phone,
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

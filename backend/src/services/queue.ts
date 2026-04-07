import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { supabaseAdmin, auditLog } from './supabase';
import * as paystack from './paystack';
import * as moolre from './moolre';

const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }) as any;

// ---- PAYOUT QUEUE ----
export const payoutQueue = new Queue('payouts', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 60000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

// ---- NOTIFICATION QUEUE ----
export const notificationQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { count: 500 },
  },
});

// ---- PAYOUT WORKER ----
export function startPayoutWorker() {
  const worker = new Worker('payouts', async (job: Job) => {
    const { payout_id, transaction_id, type, amount, destination, idempotency_key, reason } = job.data;

    console.log(`[PAYOUT_WORKER] Processing payout ${payout_id} attempt ${job.attemptsMade + 1}`);

    await supabaseAdmin
      .from('payouts')
      .update({ status: 'PROCESSING', attempts: job.attemptsMade + 1 })
      .eq('id', payout_id);

    const recipientResult = await paystack.createTransferRecipient({
      type: destination.type === 'bank' ? 'nuban' : 'mobile_money',
      name: destination.name,
      account_number: destination.account_number,
      bank_code: destination.bank_code,
    });

    const recipientCode = recipientResult.data.recipient_code;
    const transferRef = `payout_${payout_id}_${Date.now()}`;

    const transferResult = await paystack.initiateTransfer({
      amount,
      recipient_code: recipientCode,
      reference: transferRef,
      reason: reason || `${type} payout for transaction`,
    });

    await supabaseAdmin
      .from('payouts')
      .update({
        status: 'SUCCESS',
        provider_ref: transferResult.data?.reference || transferRef,
        transfer_code: transferResult.data?.transfer_code,
        completed_at: new Date().toISOString(),
      })
      .eq('id', payout_id);

    // Debit the appropriate ledger bucket
    const bucket = type === 'RIDER' ? 'DELIVERY' : 'PRODUCT';
    await supabaseAdmin.from('ledger_entries').insert({
      transaction_id,
      bucket,
      direction: 'DEBIT',
      amount,
      ref: transferRef,
      description: `${type} payout completed`,
    });

    await auditLog({
      action: 'PAYOUT_SUCCESS',
      entity: 'payouts',
      entity_id: payout_id,
      after_state: { transfer_ref: transferRef, amount },
    });

    // Fire notification
    await notificationQueue.add('send', {
      type: 'PAYOUT_SUCCESS',
      transaction_id,
      payout_type: type,
      amount,
    });

    return { success: true, transfer_ref: transferRef };
  }, {
    connection,
    concurrency: 2,
  });

  worker.on('completed', (job) => {
    console.log(`[PAYOUT_WORKER] Job ${job.id} completed`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`[PAYOUT_WORKER] Job ${job?.id} failed: ${err.message}`);
    if (job) {
      await supabaseAdmin
        .from('payouts')
        .update({
          status: job.attemptsMade >= (job.opts.attempts || 5) ? 'FAILED' : 'QUEUED',
          last_error: err.message,
          attempts: job.attemptsMade,
          next_retry_at: new Date(Date.now() + 60000 * Math.pow(2, job.attemptsMade)).toISOString(),
        })
        .eq('id', job.data.payout_id);
    }
  });

  return worker;
}

// ---- SCHEDULER QUEUE (auto-release, trust recalc, stats refresh) ----
export const schedulerQueue = new Queue('scheduler', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30000 },
    removeOnComplete: { count: 500 },
  },
});

// ---- NOTIFICATION WORKER ----
export function startNotificationWorker() {
  const worker = new Worker('notifications', async (job: Job) => {
    const { type, transaction_id, ...extra } = job.data;
    console.log(`[NOTIFICATION] ${type} for transaction ${transaction_id}`);

    const messages: { user_id: string | null; phone: string; title: string; body: string }[] = [];
    const pushMessage = (msg: { user_id: string | null; phone?: string | null; title: string; body: string }) => {
      if (!msg.phone) return;
      messages.push({ user_id: msg.user_id, phone: msg.phone, title: msg.title, body: msg.body });
    };

    let txn: any = null;
    if (transaction_id) {
      const { data } = await supabaseAdmin
        .from('transactions')
        .select('buyer_id, seller_id, buyer_phone, seller_phone, rider_phone, buyer_name, seller_name, short_id')
        .eq('id', transaction_id)
        .single();
      txn = data || null;
    }

    switch (type) {
      case 'TRANSACTION_CREATED':
        if (!txn) break;
        pushMessage({
          user_id: txn.buyer_id,
          phone: txn.buyer_phone,
          title: 'Order Created',
          body: `Your transaction ${txn.short_id} was created successfully. Complete payment to secure funds.`,
        });
        pushMessage({
          user_id: txn.seller_id || null,
          phone: txn.seller_phone,
          title: 'New Buyer Request',
          body: `A buyer created transaction ${txn.short_id}. You will be notified once payment is confirmed.`,
        });
        break;
      case 'PAYMENT_SUCCESS':
        if (!txn) break;
        messages.push({
          user_id: txn.buyer_id,
          phone: txn.buyer_phone,
          title: 'Payment Confirmed',
          body: `Your payment for transaction ${txn.short_id} has been confirmed. Your seller has been notified.`,
        });
        messages.push({
          user_id: txn.seller_id,
          phone: txn.seller_phone,
          title: 'New Order Received',
          body: `A buyer has paid for transaction ${txn.short_id}. Please log in to accept and dispatch.`,
        });
        break;
      case 'DISPATCHED':
        if (!txn) break;
        pushMessage({
          user_id: txn.buyer_id,
          phone: txn.buyer_phone,
          title: 'Order Dispatched',
          body: `Your order ${txn.short_id} has been dispatched by ${txn.seller_name}.`,
        });
        pushMessage({
          user_id: txn.seller_id,
          phone: txn.seller_phone,
          title: 'Dispatch Confirmed',
          body: `Dispatch for ${txn.short_id} was recorded successfully.`,
        });
        break;
      case 'DELIVERY_CONFIRMED':
        if (!txn) break;
        pushMessage({
          user_id: txn.seller_id,
          phone: txn.seller_phone,
          title: 'Delivery Confirmed',
          body: `The buyer has confirmed delivery for ${txn.short_id}. You can now collect your payout.`,
        });
        pushMessage({
          user_id: txn.buyer_id,
          phone: txn.buyer_phone,
          title: 'Delivery Accepted',
          body: `Delivery for ${txn.short_id} has been confirmed. Thank you for using Sell-Safe Buy-Safe.`,
        });
        break;
      case 'REPLACEMENT_REQUESTED':
        if (!txn) break;
        pushMessage({
          user_id: txn.seller_id,
          phone: txn.seller_phone,
          title: 'Replacement Requested',
          body: `Buyer requested a replacement for ${txn.short_id}. Please review and take action.`,
        });
        break;
      case 'RIDER_PAYOUT_QUEUED':
        if (!txn) break;
        pushMessage({
          user_id: txn.buyer_id,
          phone: txn.buyer_phone,
          title: 'Rider Payout Queued',
          body: `Rider payout for ${txn.short_id} has been queued.`,
        });
        pushMessage({
          user_id: null,
          phone: txn.rider_phone || extra.rider_phone,
          title: 'Delivery Payout Incoming',
          body: `Your payout for delivery on ${txn.short_id} is being processed.`,
        });
        break;
      case 'SELLER_PAYOUT_QUEUED':
        if (!txn) break;
        pushMessage({
          user_id: txn.seller_id,
          phone: txn.seller_phone,
          title: 'Seller Payout Queued',
          body: `Your payout for ${txn.short_id} has been queued for processing.`,
        });
        break;
      case 'PAYOUT_SUCCESS':
        if (!txn) break;
        pushMessage({
          user_id: null,
          phone: extra.payout_type === 'RIDER' ? txn.buyer_phone : txn.seller_phone,
          title: 'Payout Sent',
          body: `GHS ${extra.amount} payout for ${txn.short_id} has been processed.`,
        });
        break;
      case 'DISPUTE_OPENED':
        if (!txn) break;
        pushMessage({
          user_id: txn.buyer_id, phone: txn.buyer_phone,
          title: 'Dispute Opened', body: `A dispute has been opened for ${txn.short_id}.`,
        });
        pushMessage({
          user_id: txn.seller_id, phone: txn.seller_phone,
          title: 'Dispute Opened', body: `A dispute has been opened for ${txn.short_id}. Our team will review it.`,
        });
        break;
      case 'DISPUTE_RESOLVED':
        if (!txn) break;
        pushMessage({
          user_id: txn.buyer_id,
          phone: txn.buyer_phone,
          title: 'Dispute Resolved',
          body: `Dispute on ${txn.short_id} resolved with action: ${extra.resolution_action || 'N/A'}.`,
        });
        pushMessage({
          user_id: txn.seller_id,
          phone: txn.seller_phone,
          title: 'Dispute Resolved',
          body: `Dispute on ${txn.short_id} resolved with action: ${extra.resolution_action || 'N/A'}.`,
        });
        break;
      case 'REVIEW_SUBMITTED':
        if (!txn) break;
        pushMessage({
          user_id: txn.seller_id,
          phone: txn.seller_phone,
          title: 'New Review Received',
          body: `A buyer submitted a review for ${txn.short_id}.`,
        });
        break;
      case 'REVIEW_MODERATED':
        if (!txn) break;
        pushMessage({
          user_id: txn.buyer_id,
          phone: txn.buyer_phone,
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
          pushMessage({
            user_id: admin.user_id,
            phone: admin.phone,
            title: 'New KYC Submission',
            body: `${extra.applicant_role || 'User'} submitted KYC. Open admin verifications to review.`,
          });
        }
        break;
      }
      case 'KYC_STATUS_CHANGED':
        pushMessage({
          user_id: extra.target_user_id || null,
          phone: extra.target_phone || null,
          title: 'KYC Status Updated',
          body: `Your KYC status is now ${extra.status}. ${extra.reason ? `Reason: ${extra.reason}` : ''}`,
        });
        break;
      case 'ADMIN_IMPERSONATION_STARTED':
      case 'ADMIN_IMPERSONATION_STOPPED':
        pushMessage({
          user_id: extra.actor_id || null,
          phone: extra.actor_phone || null,
          title: type === 'ADMIN_IMPERSONATION_STARTED' ? 'Impersonation Started' : 'Impersonation Ended',
          body: String(extra.message || 'Admin impersonation session updated'),
        });
        break;
    }

    for (const msg of messages) {
      const ref = `sms_${transaction_id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      let channel: 'LOG' | 'SMS' = 'LOG';
      let status = 'SENT';
      let metadata: Record<string, unknown> = { type, transaction_id };

      try {
        if (msg.phone && moolre.isMoolreSmsConfigured()) {
          const smsRes = await moolre.sendSmsPost({
            messages: [
              {
                recipient: msg.phone,
                message: `${msg.title}: ${msg.body}`.slice(0, 450),
                ref,
              },
            ],
          });

          const smsSuccess = smsRes?.status === 1 || smsRes?.status === '1' || smsRes?.code === 'SMS01';
          channel = 'SMS';
          status = smsSuccess ? 'SENT' : 'FAILED';
          metadata = { ...metadata, sms_ref: ref, sms_code: smsRes?.code, sms_message: smsRes?.message, sms_raw: smsRes };
        } else {
          metadata = { ...metadata, sms_skipped: true, reason: 'Moolre SMS not configured or phone missing' };
        }
      } catch (smsErr: any) {
        channel = 'SMS';
        status = 'FAILED';
        metadata = { ...metadata, sms_ref: ref, sms_error: smsErr?.message || 'Moolre SMS send failed' };
      }

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
    }
  }, { connection, concurrency: 5 });

  return worker;
}

// ---- SCHEDULER WORKER (auto-release, trust recalc, platform stats) ----
export function startSchedulerWorker() {
  const worker = new Worker('scheduler', async (job: Job) => {
    const { type } = job.data;

    switch (type) {
      case 'AUTO_RELEASE': {
        const { data: pending } = await supabaseAdmin
          .from('transactions')
          .select('id, buyer_id, seller_id')
          .eq('status', 'DELIVERED_PENDING')
          .not('auto_release_at', 'is', null)
          .lte('auto_release_at', new Date().toISOString());

        for (const txn of pending || []) {
          await supabaseAdmin.from('transactions').update({
            status: 'DELIVERED_CONFIRMED',
            delivered_at: new Date().toISOString(),
          }).eq('id', txn.id);

          await auditLog({
            action: 'AUTO_RELEASE',
            entity: 'transactions',
            entity_id: txn.id,
            after_state: { reason: 'Auto-released after timeout' },
          });
        }
        break;
      }

      case 'RECALC_TRUST': {
        const { data: sellers } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('role', 'seller');

        for (const seller of sellers || []) {
          await supabaseAdmin.rpc('calculate_trust_score', { p_seller_id: seller.user_id });
        }
        break;
      }

      case 'REFRESH_STATS': {
        await supabaseAdmin.rpc('refresh_platform_stats');
        break;
      }

      case 'EXPIRE_CODES': {
        const { data: expired } = await supabaseAdmin
          .from('transaction_codes')
          .select('transaction_id')
          .lt('delivery_code_expires_at', new Date().toISOString())
          .eq('delivery_verified', false);

        for (const code of expired || []) {
          await auditLog({
            action: 'CODE_EXPIRED',
            entity: 'transaction_codes',
            entity_id: code.transaction_id,
          });
        }
        break;
      }
    }
  }, { connection, concurrency: 1 });

  // Schedule recurring jobs
  schedulerQueue.add('auto_release', { type: 'AUTO_RELEASE' }, {
    repeat: { every: 15 * 60 * 1000 }, // every 15 min
  });
  schedulerQueue.add('recalc_trust', { type: 'RECALC_TRUST' }, {
    repeat: { every: 6 * 60 * 60 * 1000 }, // every 6 hours
  });
  schedulerQueue.add('refresh_stats', { type: 'REFRESH_STATS' }, {
    repeat: { every: 10 * 60 * 1000 }, // every 10 min
  });
  schedulerQueue.add('expire_codes', { type: 'EXPIRE_CODES' }, {
    repeat: { every: 30 * 60 * 1000 }, // every 30 min
  });

  return worker;
}

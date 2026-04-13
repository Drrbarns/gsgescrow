import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { supabaseAdmin, auditLog } from './supabase';
import * as paystack from './paystack';
import { createHash } from 'crypto';
import { captureMessage } from './telemetry';
import { sendInlineNotification } from './notify-inline';

const isVercel = !!process.env.VERCEL;

let connection: any = null;
if (!isVercel) {
  connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  connection.on('error', (err: Error) => {
    void captureMessage('error', 'redis.connection', err.message, { redis_url: env.REDIS_URL });
  });
}

const MAX_LOG_BODY = 800;

function classifyFailure(err: unknown): { failureClass: string; retryable: boolean; message: string } {
  const message = err instanceof Error ? err.message : String(err || 'Unknown error');
  const lower = message.toLowerCase();
  if (lower.includes('not found') || lower.includes('invalid') || lower.includes('already exists')) {
    return { failureClass: 'VALIDATION', retryable: false, message };
  }
  if (lower.includes('timeout') || lower.includes('socket') || lower.includes('network')) {
    return { failureClass: 'NETWORK', retryable: true, message };
  }
  if (lower.includes('429') || lower.includes('rate')) {
    return { failureClass: 'RATE_LIMIT', retryable: true, message };
  }
  if (lower.includes('auth') || lower.includes('permission') || lower.includes('unauthorized')) {
    return { failureClass: 'AUTH', retryable: false, message };
  }
  return { failureClass: 'UNKNOWN', retryable: true, message };
}

async function emitOpsAlert(ruleKey: string, title: string, body: string, severity = 'HIGH', payload: Record<string, unknown> = {}) {
  const minIntervalSec = Math.max(30, env.OPS_ALERT_MIN_INTERVAL_SEC || 300);
  const sinceIso = new Date(Date.now() - minIntervalSec * 1000).toISOString();
  const { data: recent } = await supabaseAdmin
    .from('admin_alert_events')
    .select('id')
    .eq('rule_key', ruleKey)
    .gte('created_at', sinceIso)
    .limit(1);
  if (recent && recent.length > 0) return;

  await supabaseAdmin.from('admin_alert_events').insert({
    rule_key: ruleKey,
    severity,
    title,
    body,
    payload,
    status: 'OPEN',
  });
}

async function recordDeadLetter(queueName: string, job: Job, err: unknown, metadata: Record<string, unknown> = {}) {
  const maxAttempts = Number(job.opts.attempts || 1);
  const details = classifyFailure(err);
  const payload = job.data || {};
  const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');

  await supabaseAdmin.from('ops_dead_letters').insert({
    queue_name: queueName,
    job_id: String(job.id || ''),
    job_name: job.name,
    failure_class: details.failureClass,
    error_message: details.message.slice(0, MAX_LOG_BODY),
    attempts_made: job.attemptsMade,
    max_attempts: maxAttempts,
    is_retryable: details.retryable,
    payload_hash: payloadHash,
    payload,
    metadata,
  });
}

async function recordQueueSnapshot() {
  const queues = [
    { name: 'payouts', ref: payoutQueue },
    { name: 'notifications', ref: notificationQueue },
    { name: 'scheduler', ref: schedulerQueue },
  ];
  for (const queue of queues) {
    const counts = await queue.ref.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    const entries = Object.entries(counts);
    if (!entries.length) continue;
    await supabaseAdmin.from('ops_metric_snapshots').insert(
      entries.map(([key, value]) => ({
        metric_key: 'queue_count',
        metric_group: queue.name,
        metric_value: Number(value || 0),
        dimensions: { state: key },
      }))
    );
  }
}

export async function pingRedis() {
  if (!connection) return { ok: false, message: 'Redis not configured (serverless mode)' };
  try {
    const pong = await connection.ping();
    return { ok: pong === 'PONG', message: pong };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Redis ping failed' };
  }
}

export async function getQueueHealth() {
  const entries = [
    { key: 'payouts', queue: payoutQueue },
    { key: 'notifications', queue: notificationQueue },
    { key: 'scheduler', queue: schedulerQueue },
  ];
  const out: Array<{ name: string; ok: boolean; counts?: Record<string, number>; error?: string }> = [];
  for (const entry of entries) {
    try {
      const counts = await entry.queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
      out.push({ name: entry.key, ok: true, counts });
    } catch (err: any) {
      out.push({ name: entry.key, ok: false, error: err?.message || 'Queue unavailable' });
    }
  }
  return out;
}

const noopQueue = { add: async () => {}, getJobCounts: async () => ({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 }) } as any;

// ---- PAYOUT QUEUE ----
export const payoutQueue: Queue = connection
  ? new Queue('payouts', {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 60000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    })
  : noopQueue;

// ---- NOTIFICATION QUEUE ----
export const notificationQueue: Queue = connection
  ? new Queue('notifications', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: { count: 500 },
      },
    })
  : noopQueue;

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
    void captureMessage('info', 'worker.payout', `Job ${job.id} completed`, { job_id: job.id, attempts: job.attemptsMade });
  });

  worker.on('failed', async (job, err) => {
    console.error(`[PAYOUT_WORKER] Job ${job?.id} failed: ${err.message}`);
    if (job) {
      const maxAttempts = Number(job.opts.attempts || 5);
      const willExhaust = job.attemptsMade >= maxAttempts;
      const details = classifyFailure(err);
      const finalStatus = !details.retryable || willExhaust ? 'FAILED' : 'QUEUED';
      await supabaseAdmin
        .from('payouts')
        .update({
          status: finalStatus,
          last_error: err.message,
          attempts: job.attemptsMade,
          next_retry_at: new Date(Date.now() + 60000 * Math.pow(2, job.attemptsMade)).toISOString(),
        })
        .eq('id', job.data.payout_id);

      await captureMessage('error', 'worker.payout', err.message, {
        job_id: job.id,
        payout_id: job.data?.payout_id,
        attempts: job.attemptsMade,
        final_status: finalStatus,
        failure_class: details.failureClass,
      });

      if (finalStatus === 'FAILED') {
        await recordDeadLetter('payouts', job, err, { payout_id: job.data?.payout_id });
        const { count } = await supabaseAdmin
          .from('ops_dead_letters')
          .select('id', { count: 'exact', head: true })
          .eq('queue_name', 'payouts')
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
        if ((count || 0) >= env.OPS_PAYOUT_FAILURE_THRESHOLD_1H) {
          await emitOpsAlert(
            'payout_fail_spike',
            'Payout failures increasing',
            `Payout dead-letters in the last 1 hour reached ${count}.`,
            'CRITICAL',
            { count_1h: count, threshold: env.OPS_PAYOUT_FAILURE_THRESHOLD_1H }
          );
        }
      }
    }
  });

  worker.on('stalled', (jobId) => {
    void captureMessage('warn', 'worker.payout', `Job ${jobId} stalled`, { job_id: jobId });
  });

  worker.on('error', (err) => {
    void captureMessage('error', 'worker.payout', err.message, { event: 'worker_error' });
  });

  return worker;
}

// ---- SCHEDULER QUEUE (auto-release, trust recalc, stats refresh) ----
export const schedulerQueue: Queue = connection
  ? new Queue('scheduler', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
        removeOnComplete: { count: 500 },
      },
    })
  : noopQueue;

// ---- NOTIFICATION WORKER ----
export function startNotificationWorker() {
  const worker = new Worker('notifications', async (job: Job) => {
    const { type, transaction_id, ...extra } = job.data;
    console.log(`[NOTIFICATION] ${type} for transaction ${transaction_id}`);

    const entityId = String(transaction_id || '').trim();
    if (!type || !entityId) {
      await captureMessage('warn', 'worker.notification', 'Skipping notification job with missing type/entityId', {
        job_id: job.id,
        type,
        entity_id: transaction_id,
      });
      return;
    }

    await sendInlineNotification(type, entityId, extra);
  }, { connection, concurrency: 5 });

  worker.on('completed', (job) => {
    void captureMessage('info', 'worker.notification', `Job ${job.id} completed`, { job_id: job.id, attempts: job.attemptsMade });
  });

  worker.on('failed', async (job, err) => {
    if (!job) return;
    const details = classifyFailure(err);
    await captureMessage('error', 'worker.notification', err.message, {
      job_id: job.id,
      attempts: job.attemptsMade,
      failure_class: details.failureClass,
    });
    if (!details.retryable || job.attemptsMade >= Number(job.opts.attempts || 3)) {
      await recordDeadLetter('notifications', job, err);
    }
  });

  worker.on('stalled', (jobId) => {
    void captureMessage('warn', 'worker.notification', `Job ${jobId} stalled`, { job_id: jobId });
  });

  worker.on('error', (err) => {
    void captureMessage('error', 'worker.notification', err.message, { event: 'worker_error' });
  });

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
        await recordQueueSnapshot();
        break;
      }

      case 'EXPIRE_CODES': {
        const { data: expired } = await supabaseAdmin
          .from('transaction_codes')
          .select('transaction_id')
          .lt('delivery_code_expires_at', new Date().toISOString())
          .eq('delivery_verified', false);

        for (const code of expired || []) {
          await supabaseAdmin
            .from('transaction_codes')
            .update({
              delivery_code_hash: null,
              delivery_code_expires_at: null,
            })
            .eq('transaction_id', code.transaction_id)
            .eq('delivery_verified', false);

          await auditLog({
            action: 'CODE_EXPIRED',
            entity: 'transaction_codes',
            entity_id: code.transaction_id,
            after_state: { reason: 'Delivery code expired and invalidated' },
          });
        }
        break;
      }
    }
  }, { connection, concurrency: 1 });

  worker.on('completed', (job) => {
    void captureMessage('info', 'worker.scheduler', `Job ${job.id} completed`, { job_id: job.id, job_name: job.name });
  });

  worker.on('failed', async (job, err) => {
    if (!job) return;
    const details = classifyFailure(err);
    await captureMessage('error', 'worker.scheduler', err.message, {
      job_id: job.id,
      job_name: job.name,
      attempts: job.attemptsMade,
      failure_class: details.failureClass,
    });
    if (!details.retryable || job.attemptsMade >= Number(job.opts.attempts || 3)) {
      await recordDeadLetter('scheduler', job, err);
      await emitOpsAlert(
        'scheduler_drift',
        'Scheduler reliability issue detected',
        `Scheduler job ${job.name} failed after retries.`,
        'HIGH',
        { job_name: job.name, job_id: job.id, attempts: job.attemptsMade }
      );
    }
  });

  worker.on('stalled', async (jobId) => {
    await captureMessage('warn', 'worker.scheduler', `Job ${jobId} stalled`, { job_id: jobId });
    await emitOpsAlert(
      'scheduler_drift',
      'Scheduler job stalled',
      `Scheduler detected stalled job ${jobId}.`,
      'HIGH',
      { job_id: jobId }
    );
  });

  worker.on('error', (err) => {
    void captureMessage('error', 'worker.scheduler', err.message, { event: 'worker_error' });
  });

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

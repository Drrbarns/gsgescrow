import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { env } from './config/env';
import { requestIdMiddleware, errorHandler, notFound } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import paymentRoutes from './routes/payments';
import payoutRoutes from './routes/payouts';
import webhookRoutes from './routes/webhooks';
import transactionRoutes from './routes/transactions';
import disputeRoutes from './routes/disputes';
import adminRoutes from './routes/admin';
import reviewRoutes from './routes/reviews';
import sellerDashboardRoutes from './routes/seller-dashboard';
import publicRoutes from './routes/public';
import marketplaceRoutes from './routes/marketplace';
import { getQueueHealth, pingRedis, startPayoutWorker, startNotificationWorker, startSchedulerWorker } from './services/queue';
import { captureException, captureMessage, initTelemetry } from './services/telemetry';

const app = express();
initTelemetry();
app.set('trust proxy', true);

app.use(helmet());
const allowedExactOrigins = new Set(env.CORS_ORIGINS);
const allowedDomainPattern = /^https?:\/\/([a-z0-9-]+\.)*sellbuysafe\.gsgbrands\.com(\.gh)?(:\d+)?$/i;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedExactOrigins.has(origin) || allowedDomainPattern.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS blocked: origin not allowed'));
  },
  credentials: true,
}));
app.use(requestIdMiddleware);
app.use(morgan(':method :url :status :response-time ms - :req[x-request-id]'));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
}));

app.use(express.json({ limit: '5mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/seller', sellerDashboardRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/marketplace', marketplaceRoutes);

app.get('/health', (_req, res) => {
  void (async () => {
    const [redis, queues] = await Promise.all([pingRedis(), getQueueHealth()]);
    const healthy = redis.ok && queues.every((q) => q.ok);
    // Keep health endpoint as liveness (always 200) so infra does not
    // hard-fail the API when optional dependencies are degraded.
    res.status(200).json({
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      redis,
      queues,
    });
  })();
});

app.get('/ready', (_req, res) => {
  void (async () => {
    const [redis, queues] = await Promise.all([pingRedis(), getQueueHealth()]);
    const healthy = redis.ok && queues.every((q) => q.ok);
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ready' : 'degraded',
      timestamp: new Date().toISOString(),
      redis,
      queues,
    });
  })();
});

app.use(notFound);
app.use(errorHandler);

let payoutWorker: ReturnType<typeof startPayoutWorker> | null = null;
let notificationWorker: ReturnType<typeof startNotificationWorker> | null = null;
let schedulerWorker: ReturnType<typeof startSchedulerWorker> | null = null;

try {
  payoutWorker = startPayoutWorker();
  notificationWorker = startNotificationWorker();
  schedulerWorker = startSchedulerWorker();
  console.log('[WORKERS] Payout, notification, and scheduler workers started');
  void captureMessage('info', 'startup', 'Workers started', { queues: ['payouts', 'notifications', 'scheduler'] });
} catch (err: any) {
  console.error('[WORKERS] Failed to start one or more workers:', err?.message || err);
  void captureException(err, { tag: 'startup.workers' });
}

process.on('SIGTERM', async () => {
  console.log('[SHUTDOWN] Graceful shutdown...');
  await Promise.all([
    payoutWorker?.close(),
    notificationWorker?.close(),
    schedulerWorker?.close(),
  ]);
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  void captureException(reason, { tag: 'process.unhandledRejection' });
});

process.on('uncaughtException', (error) => {
  void captureException(error, { tag: 'process.uncaughtException' });
});

app.listen(env.PORT, () => {
  console.log(`[SERVER] Running on port ${env.PORT} (${env.NODE_ENV})`);
});

export default app;

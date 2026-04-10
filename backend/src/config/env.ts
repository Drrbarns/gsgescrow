import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) {
    const msg = `Missing required env var: ${key}`;
    console.error(`[ENV] ${msg}`);
    if (process.env.VERCEL) return '';
    throw new Error(msg);
  }
  return val;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  SUPABASE_URL: required('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),
  SUPABASE_JWT_SECRET: required('SUPABASE_JWT_SECRET'),
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || '',
  PAYMENT_PROVIDER: (process.env.PAYMENT_PROVIDER || 'moolre').toLowerCase(),
  MOOLRE_API_USER: process.env.MOOLRE_API_USER || '',
  MOOLRE_API_PUBKEY: process.env.MOOLRE_API_PUBKEY || '',
  MOOLRE_ACCOUNT_NUMBER: process.env.MOOLRE_ACCOUNT_NUMBER || '',
  MOOLRE_BUSINESS_EMAIL: process.env.MOOLRE_BUSINESS_EMAIL || '',
  MOOLRE_CALLBACK_SECRET: process.env.MOOLRE_CALLBACK_SECRET || '',
  MOOLRE_API_VASKEY: process.env.MOOLRE_API_VASKEY || '',
  MOOLRE_SMS_SENDER_ID: process.env.MOOLRE_SMS_SENDER_ID || '',
  MOOLRE_SMS_SCENARIO_KEY: process.env.MOOLRE_SMS_SCENARIO_KEY || '',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  APP_URL: process.env.APP_URL || 'https://sellbuysafe.gsgbrands.com',
  API_PUBLIC_URL: process.env.API_PUBLIC_URL || '',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'https://sellbuysafe.gsgbrands.com')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
  SENTRY_DSN: process.env.SENTRY_DSN || '',
  SENTRY_ENV: process.env.SENTRY_ENV || process.env.NODE_ENV || 'development',
  OPS_ALERT_MIN_INTERVAL_SEC: parseInt(process.env.OPS_ALERT_MIN_INTERVAL_SEC || '300', 10),
  OPS_PAYOUT_FAILURE_THRESHOLD_1H: parseInt(process.env.OPS_PAYOUT_FAILURE_THRESHOLD_1H || '3', 10),
  OPS_SMS_FAILURE_RATIO_THRESHOLD_PCT: parseInt(process.env.OPS_SMS_FAILURE_RATIO_THRESHOLD_PCT || '25', 10),
  OPS_SCHEDULER_DRIFT_THRESHOLD_SEC: parseInt(process.env.OPS_SCHEDULER_DRIFT_THRESHOLD_SEC || '1200', 10),
  /** When true, payment/payout endpoints allow simulation (no real Paystack). */
  SIMULATION_MODE: process.env.SIMULATION_MODE === 'true',
} as const;

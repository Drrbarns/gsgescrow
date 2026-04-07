import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
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
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  APP_URL: process.env.APP_URL || 'https://sellbuysafe.gsgbrands.com',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'https://sellbuysafe.gsgbrands.com').split(','),
  /** When true, payment/payout endpoints allow simulation (no real Paystack). */
  SIMULATION_MODE: process.env.SIMULATION_MODE === 'true',
} as const;

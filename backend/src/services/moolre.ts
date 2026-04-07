import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';

const client: AxiosInstance = axios.create({
  baseURL: 'https://api.moolre.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function isMoolreConfigured() {
  return !!(env.MOOLRE_API_USER && env.MOOLRE_API_PUBKEY && env.MOOLRE_ACCOUNT_NUMBER);
}

export async function generatePaymentLink(params: {
  amount: number;
  externalref: string;
  callback: string;
  redirect: string;
  metadata?: Record<string, unknown>;
}) {
  if (!isMoolreConfigured()) {
    throw new Error('Moolre credentials are not configured');
  }

  const payload = {
    type: 1,
    amount: Number(params.amount),
    email: env.MOOLRE_BUSINESS_EMAIL || 'support@sellbuysafe.gsgbrands.com',
    externalref: params.externalref,
    callback: params.callback,
    redirect: params.redirect,
    reusable: '0',
    currency: 'GHS',
    accountnumber: env.MOOLRE_ACCOUNT_NUMBER,
    metadata: params.metadata || {},
  };

  const { data } = await client.post('/embed/link', payload, {
    headers: {
      'X-API-USER': env.MOOLRE_API_USER,
      'X-API-PUBKEY': env.MOOLRE_API_PUBKEY,
    },
  });

  return data;
}


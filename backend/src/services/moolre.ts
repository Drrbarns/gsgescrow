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

export function isMoolreSmsConfigured() {
  return !!(env.MOOLRE_API_VASKEY && env.MOOLRE_SMS_SENDER_ID);
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
    amount: Number(params.amount).toString(),
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

export async function getPaymentStatus(externalref: string) {
  if (!isMoolreConfigured()) {
    throw new Error('Moolre credentials are not configured');
  }
  if (!externalref) {
    throw new Error('externalref is required');
  }

  const { data } = await client.post('/embed/status', { externalref }, {
    headers: {
      'X-API-USER': env.MOOLRE_API_USER,
      'X-API-PUBKEY': env.MOOLRE_API_PUBKEY,
    },
  });

  return data;
}

export async function sendSmsPost(params: {
  senderid?: string;
  messages: Array<{ recipient: string; message: string; ref?: string }>;
}) {
  if (!isMoolreSmsConfigured()) {
    throw new Error('Moolre SMS credentials are not configured');
  }
  if (!params.messages?.length) {
    throw new Error('At least one SMS message is required');
  }

  const payload = {
    type: 1,
    senderid: params.senderid || env.MOOLRE_SMS_SENDER_ID,
    messages: params.messages.map((m) => ({
      recipient: m.recipient,
      message: m.message,
      ref: m.ref || undefined,
    })),
  };

  const headers: Record<string, string> = {
    'X-API-VASKEY': env.MOOLRE_API_VASKEY,
  };
  if (env.MOOLRE_SMS_SCENARIO_KEY) {
    headers['X-Scenario-Key'] = env.MOOLRE_SMS_SCENARIO_KEY;
  }

  const { data } = await client.post('/open/sms/send', payload, { headers });
  return data;
}


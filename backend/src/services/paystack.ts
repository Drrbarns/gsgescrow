import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { env } from '../config/env';

const client: AxiosInstance = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export async function initializePayment(params: {
  amount: number; // GHS amount (will convert to pesewas)
  email: string;
  reference: string;
  callback_url: string;
  metadata?: Record<string, unknown>;
}) {
  const { data } = await client.post('/transaction/initialize', {
    amount: Math.round(params.amount * 100), // pesewas
    email: params.email,
    reference: params.reference,
    currency: 'GHS',
    callback_url: params.callback_url,
    metadata: params.metadata,
  });
  return data;
}

export async function verifyPayment(reference: string) {
  const { data } = await client.get(`/transaction/verify/${encodeURIComponent(reference)}`);
  return data;
}

export async function createTransferRecipient(params: {
  type: 'mobile_money' | 'nuban';
  name: string;
  account_number: string;
  bank_code: string;
  currency?: string;
}) {
  const { data } = await client.post('/transferrecipient', {
    type: params.type,
    name: params.name,
    account_number: params.account_number,
    bank_code: params.bank_code,
    currency: params.currency || 'GHS',
  });
  return data;
}

export async function initiateTransfer(params: {
  amount: number; // GHS amount
  recipient_code: string;
  reference: string;
  reason: string;
}) {
  const { data } = await client.post('/transfer', {
    source: 'balance',
    amount: Math.round(params.amount * 100), // pesewas
    recipient: params.recipient_code,
    reference: params.reference,
    reason: params.reason,
    currency: 'GHS',
  });
  return data;
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
    .update(body)
    .digest('hex');
  return hash === signature;
}

export async function listBanks(currency = 'GHS') {
  const { data } = await client.get(`/bank?currency=${currency}`);
  return data;
}

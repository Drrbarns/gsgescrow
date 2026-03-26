import { supabaseAdmin } from './supabase';
import crypto from 'crypto';

function generateReceiptNumber(type: string): string {
  const prefix = type === 'PAYMENT' ? 'PAY' : type === 'DELIVERY' ? 'DEL' : 'PYO';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

export async function createPaymentReceipt(transactionId: string) {
  const { data: txn } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (!txn) return null;

  const receiptData = {
    type: 'PAYMENT',
    transaction_id: txn.id,
    short_id: txn.short_id,
    buyer_name: txn.buyer_name,
    seller_name: txn.seller_name,
    product_name: txn.product_name,
    product_total: txn.product_total,
    delivery_fee: txn.delivery_fee,
    rider_release_fee: txn.rider_release_fee,
    buyer_platform_fee: txn.buyer_platform_fee,
    grand_total: txn.grand_total,
    paid_at: txn.paid_at,
    payment_reference: txn.paystack_reference,
    escrow_status: 'Funds held securely with licensed PSPs',
    protection_message: 'Your money is protected until you confirm delivery',
  };

  const { data: receipt } = await supabaseAdmin
    .from('transaction_receipts')
    .insert({
      transaction_id: transactionId,
      receipt_number: generateReceiptNumber('PAYMENT'),
      receipt_type: 'PAYMENT',
      data: receiptData,
    })
    .select()
    .single();

  return receipt;
}

export async function createDeliveryReceipt(transactionId: string) {
  const { data: txn } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (!txn) return null;

  const receiptData = {
    type: 'DELIVERY_CONFIRMATION',
    transaction_id: txn.id,
    short_id: txn.short_id,
    buyer_name: txn.buyer_name,
    seller_name: txn.seller_name,
    product_name: txn.product_name,
    delivered_at: txn.delivered_at,
    rider_name: txn.rider_name,
    delivery_address: txn.delivery_address,
    confirmation_message: 'Delivery verified. Seller payout has been authorized.',
  };

  const { data: receipt } = await supabaseAdmin
    .from('transaction_receipts')
    .insert({
      transaction_id: transactionId,
      receipt_number: generateReceiptNumber('DELIVERY'),
      receipt_type: 'DELIVERY',
      data: receiptData,
    })
    .select()
    .single();

  return receipt;
}

export async function getReceipts(transactionId: string) {
  const { data } = await supabaseAdmin
    .from('transaction_receipts')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: true });

  return data || [];
}

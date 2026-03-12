import { supabaseAdmin, auditLog } from './supabase';

interface FraudFlag {
  code: string;
  label: string;
  weight: number;
}

export async function scoreFraudRisk(transactionId: string): Promise<{ score: number; flags: FraudFlag[] }> {
  const { data: txn } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (!txn) return { score: 0, flags: [] };

  const flags: FraudFlag[] = [];

  // High-value transaction
  if (txn.grand_total > 5000) {
    flags.push({ code: 'HIGH_VALUE', label: 'Transaction exceeds GHS 5,000', weight: 15 });
  }
  if (txn.grand_total > 20000) {
    flags.push({ code: 'VERY_HIGH_VALUE', label: 'Transaction exceeds GHS 20,000', weight: 25 });
  }

  // Buyer velocity: many transactions in short window
  const { count: buyerRecent } = await supabaseAdmin
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('buyer_id', txn.buyer_id)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

  if ((buyerRecent || 0) > 3) {
    flags.push({ code: 'BUYER_VELOCITY', label: 'Buyer created 3+ transactions in 1 hour', weight: 20 });
  }

  // Same buyer and seller phone
  if (txn.buyer_phone === txn.seller_phone) {
    flags.push({ code: 'SELF_TRANSACTION', label: 'Buyer and seller phone numbers match', weight: 40 });
  }

  // No listing link for high-value
  if (!txn.listing_link && txn.product_total > 2000) {
    flags.push({ code: 'NO_LISTING_HIGH_VALUE', label: 'No listing link for high-value transaction', weight: 10 });
  }

  // Seller has previous disputes
  const { count: sellerDisputes } = await supabaseAdmin
    .from('disputes')
    .select('id', { count: 'exact', head: true })
    .eq('opened_by', txn.seller_id || 'none')
    .eq('status', 'RESOLVED');

  if ((sellerDisputes || 0) > 2) {
    flags.push({ code: 'SELLER_DISPUTE_HISTORY', label: 'Seller has 2+ resolved disputes', weight: 15 });
  }

  // New seller with no completed transactions
  if (txn.seller_id) {
    const { count: sellerCompleted } = await supabaseAdmin
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', txn.seller_id)
      .eq('status', 'COMPLETED');

    if ((sellerCompleted || 0) === 0 && txn.product_total > 1000) {
      flags.push({ code: 'NEW_SELLER_HIGH_VALUE', label: 'New seller with high-value transaction', weight: 15 });
    }
  }

  // Delivery address is very short (suspicious)
  if (txn.delivery_address && txn.delivery_address.length < 15) {
    flags.push({ code: 'SHORT_ADDRESS', label: 'Delivery address suspiciously short', weight: 5 });
  }

  // Round-number pricing (common in scams)
  if (txn.product_total % 1000 === 0 && txn.product_total > 2000) {
    flags.push({ code: 'ROUND_NUMBER', label: 'Suspiciously round product price', weight: 5 });
  }

  const score = Math.min(100, flags.reduce((sum, f) => sum + f.weight, 0));

  await supabaseAdmin.from('transactions').update({
    fraud_score: score,
    fraud_flags: flags,
    is_flagged: score >= 75,
  }).eq('id', transactionId);

  if (score >= 75) {
    await auditLog({
      action: 'FRAUD_AUTO_FLAG',
      entity: 'transactions',
      entity_id: transactionId,
      after_state: { score, flags: flags.map(f => f.code) },
    });
  }

  return { score, flags };
}

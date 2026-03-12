import { supabaseAdmin } from './supabase';

export async function recalculateTrustScore(sellerId: string) {
  const { data } = await supabaseAdmin.rpc('calculate_trust_score', { p_seller_id: sellerId });
  return data;
}

export async function getSellerTrustScore(sellerId: string) {
  const { data } = await supabaseAdmin
    .from('seller_trust_scores')
    .select('*')
    .eq('seller_id', sellerId)
    .single();
  return data;
}

export async function getSellerAnalytics(sellerId: string) {
  const { data: transactions } = await supabaseAdmin
    .from('transactions')
    .select('id, status, product_total, grand_total, seller_platform_fee, created_at, completed_at, dispatched_at, delivered_at')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  const txns = transactions || [];
  const completed = txns.filter(t => t.status === 'COMPLETED');
  const totalRevenue = completed.reduce((s, t) => s + parseFloat(t.product_total) - parseFloat(t.seller_platform_fee || '0'), 0);
  const totalFees = txns.reduce((s, t) => s + parseFloat(t.seller_platform_fee || '0'), 0);

  // Calculate average delivery time
  const deliveryTimes = completed
    .filter(t => t.dispatched_at && t.delivered_at)
    .map(t => (new Date(t.delivered_at).getTime() - new Date(t.dispatched_at).getTime()) / (1000 * 60 * 60));
  const avgDeliveryHours = deliveryTimes.length > 0
    ? deliveryTimes.reduce((s, h) => s + h, 0) / deliveryTimes.length
    : null;

  // Monthly revenue
  const monthlyRevenue: Record<string, number> = {};
  completed.forEach(t => {
    const month = t.completed_at?.substring(0, 7) || t.created_at.substring(0, 7);
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + parseFloat(t.product_total) - parseFloat(t.seller_platform_fee || '0');
  });

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  txns.forEach(t => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });

  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select('seller_rating, delivery_rating')
    .in('transaction_id', txns.map(t => t.id))
    .eq('status', 'APPROVED');

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((s, r) => s + (r.seller_rating || 0), 0) / reviews.length
    : null;

  // Repeat buyer rate
  const { data: buyerCounts } = await supabaseAdmin
    .from('transactions')
    .select('buyer_id')
    .eq('seller_id', sellerId);

  const uniqueBuyers = new Set(buyerCounts?.map(b => b.buyer_id)).size;
  const repeatBuyerRate = uniqueBuyers > 0 && (buyerCounts?.length || 0) > uniqueBuyers
    ? ((buyerCounts!.length - uniqueBuyers) / buyerCounts!.length * 100)
    : 0;

  return {
    total_transactions: txns.length,
    completed_transactions: completed.length,
    total_revenue: totalRevenue,
    total_fees_paid: totalFees,
    avg_delivery_hours: avgDeliveryHours,
    avg_rating: avgRating,
    total_reviews: reviews?.length || 0,
    unique_buyers: uniqueBuyers,
    repeat_buyer_rate: repeatBuyerRate,
    monthly_revenue: monthlyRevenue,
    status_breakdown: statusCounts,
    recent_transactions: txns.slice(0, 10),
  };
}

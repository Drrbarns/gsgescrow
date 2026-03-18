import { API_URL } from './constants';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async getSupabase() {
    const { createClient } = await import('./supabase/browser');
    return createClient();
  }

  private async getToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const supabase = await this.getSupabase();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  private async getUserId(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const supabase = await this.getSupabase();
    const { data } = await supabase.auth.getUser();
    return data.user?.id || null;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  }

  // Auth
  createProfile(data: Record<string, unknown>) {
    return this.request('/api/auth/profile', { method: 'POST', body: JSON.stringify(data) });
  }
  getMe() {
    return this.request<{ data: any }>('/api/auth/me');
  }
  getBanks() {
    return this.request<{ data: any[] }>('/api/auth/banks');
  }

  // Transactions
  createTransaction(data: Record<string, unknown>) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),
      async () => {
        const supabase = await this.getSupabase();
        const uid = await this.getUserId();
        if (!uid) throw new Error('Not authenticated');
        const buyerFeePercent = 0.5;
        const riderReleaseFee = 1.0;
        const pt = Number(data.product_total) || 0;
        const df = Number(data.delivery_fee) || 0;
        const buyerPlatformFee = parseFloat((pt * buyerFeePercent / 100).toFixed(2));
        const sellerPlatformFee = parseFloat((pt * 0.75 / 100).toFixed(2));
        const grandTotal = pt + df + riderReleaseFee + buyerPlatformFee;
        const { data: userData } = await supabase.auth.getUser();
        const buyerPhone = userData.user?.phone || userData.user?.email || '';
        const { data: txn, error } = await supabase.from('transactions').insert({
          buyer_id: uid, buyer_phone: buyerPhone,
          seller_phone: data.seller_phone, seller_name: data.seller_name,
          buyer_name: data.buyer_name, listing_link: data.listing_link,
          source_platform: data.source_platform, product_type: data.product_type,
          product_name: data.product_name, delivery_address: data.delivery_address,
          delivery_date: data.delivery_date, product_total: pt, delivery_fee: df,
          rider_release_fee: riderReleaseFee, buyer_platform_fee: buyerPlatformFee,
          seller_platform_fee: sellerPlatformFee, grand_total: grandTotal, status: 'SUBMITTED',
        }).select().single();
        if (error) throw new Error(error.message);
        return { data: txn };
      }
    );
  }
  listTransactions(params?: Record<string, string>) {
    return this.requestWithFallback<{ data: any[]; total: number }>(
      () => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: any[]; total: number }>(`/api/transactions${qs}`);
      },
      async () => {
        const supabase = await this.getSupabase();
        const uid = await this.getUserId();
        if (!uid) return { data: [], total: 0 };
        let query = supabase.from('transactions').select('*', { count: 'exact' })
          .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
          .order('created_at', { ascending: false });
        if (params?.status) query = query.eq('status', params.status);
        if (params?.platform) query = query.eq('source_platform', params.platform);
        if (params?.search) query = query.or(`short_id.ilike.%${params.search}%,product_name.ilike.%${params.search}%`);
        const pg = parseInt(params?.page || '1', 10);
        const lim = parseInt(params?.limit || '20', 10);
        const from = (pg - 1) * lim;
        const { data, count } = await query.range(from, from + lim - 1);
        return { data: data || [], total: count || 0 };
      }
    );
  }
  getTransaction(id: string) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>(`/api/transactions/${id}`),
      async () => {
        const supabase = await this.getSupabase();
        const { data, error } = await supabase.from('transactions').select('*').eq('id', id).single();
        if (error) throw new Error(error.message);
        return { data };
      }
    );
  }

  private async requestWithFallback<T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    try {
      return await primary();
    } catch {
      return await fallback();
    }
  }
  dispatchTransaction(id: string, data: Record<string, unknown>) {
    return this.request<{ data: any }>(`/api/transactions/${id}/dispatch`, { method: 'POST', body: JSON.stringify(data) });
  }
  verifyDelivery(id: string, deliveryCode: string) {
    return this.request<{ data: any }>(`/api/transactions/${id}/verify-delivery`, { method: 'POST', body: JSON.stringify({ delivery_code: deliveryCode }) });
  }
  requestReplacement(id: string) {
    return this.request<{ data: any }>(`/api/transactions/${id}/request-replacement`, { method: 'POST' });
  }
  trackTransaction(query: string) {
    return this.request<{ data: any[] }>(`/api/transactions/track/${encodeURIComponent(query)}`);
  }

  // Payments
  initiatePayment(transactionId: string) {
    return this.request<{ data: { authorization_url: string; reference: string } }>('/api/payments/initiate', { method: 'POST', body: JSON.stringify({ transaction_id: transactionId }) });
  }
  verifyPayment(reference: string) {
    return this.request<{ data: any }>('/api/payments/verify', { method: 'POST', body: JSON.stringify({ reference }) });
  }
  simulatePayment(transactionId: string) {
    return this.requestWithFallback<{ data: { transaction_id: string; short_id: string } }>(
      () => this.request<{ data: { transaction_id: string; short_id: string } }>('/api/payments/simulate', { method: 'POST', body: JSON.stringify({ transaction_id: transactionId }) }),
      async () => {
        const supabase = await this.getSupabase();
        const { data: txn, error: fetchErr } = await supabase.from('transactions').select('id, short_id, status').eq('id', transactionId).single();
        if (fetchErr || !txn) throw new Error('Transaction not found');
        if (txn.status !== 'SUBMITTED') throw new Error('Already paid');
        const { error } = await supabase.from('transactions').update({ status: 'PAID', paid_at: new Date().toISOString() }).eq('id', transactionId);
        if (error) throw new Error(error.message);
        // Create transaction_codes with fixed SIM0000 hash
        const bcryptHash = '$2a$10$simulated_hash_for_SIM0000_placeholder';
        await supabase.from('transaction_codes').upsert({
          transaction_id: transactionId,
          delivery_code_hash: bcryptHash,
          delivery_code_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        });
        return { data: { transaction_id: txn.id, short_id: txn.short_id } };
      }
    );
  }
  getSimulationDeliveryCode(transactionId: string) {
    return this.request<{ data: { delivery_code: string } }>(`/api/transactions/${transactionId}/simulation-delivery-code`);
  }

  // Payouts
  payRider(data: { transaction_id: string; rider_momo_number: string; delivery_code: string }) {
    return this.request<{ data: any }>('/api/payouts/rider', { method: 'POST', body: JSON.stringify(data) });
  }
  paySeller(data: { transaction_id: string; delivery_code: string; partial_code: string }) {
    return this.request<{ data: any }>('/api/payouts/seller', { method: 'POST', body: JSON.stringify(data) });
  }
  listPayouts(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[]; total: number }>(`/api/payouts${qs}`);
  }
  holdPayout(id: string, reason: string) {
    return this.request('/api/payouts/' + id + '/hold', { method: 'POST', body: JSON.stringify({ reason }) });
  }
  releasePayout(id: string) {
    return this.request('/api/payouts/' + id + '/release', { method: 'POST' });
  }
  retryPayout(id: string) {
    return this.request('/api/payouts/' + id + '/retry', { method: 'POST' });
  }

  // Disputes
  openDispute(data: { transaction_id: string; reason: string }) {
    return this.request<{ data: any }>('/api/disputes', { method: 'POST', body: JSON.stringify(data) });
  }
  listDisputes(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[]; total: number }>(`/api/disputes${qs}`);
  }
  getDispute(id: string) {
    return this.request<{ data: any }>(`/api/disputes/${id}`);
  }
  uploadEvidence(disputeId: string, data: Record<string, unknown>) {
    return this.request('/api/disputes/' + disputeId + '/evidence', { method: 'POST', body: JSON.stringify(data) });
  }
  resolveDispute(id: string, data: Record<string, unknown>) {
    return this.request('/api/disputes/' + id + '/resolve', { method: 'POST', body: JSON.stringify(data) });
  }

  // Reviews
  createReview(data: Record<string, unknown>) {
    return this.request<{ data: any }>('/api/reviews', { method: 'POST', body: JSON.stringify(data) });
  }
  listReviews(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[]; total: number }>(`/api/reviews${qs}`);
  }
  moderateReview(id: string, status: string) {
    return this.request('/api/reviews/' + id + '/moderate', { method: 'POST', body: JSON.stringify({ status }) });
  }

  // Admin
  getDashboard() {
    return this.request<{ data: any }>('/api/admin/dashboard');
  }
  getAuditLogs(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[]; total: number }>(`/api/admin/audit-logs${qs}`);
  }
  getSettings() {
    return this.request<{ data: any[] }>('/api/admin/settings');
  }
  updateSetting(key: string, value: string) {
    return this.request('/api/admin/settings/' + key, { method: 'PUT', body: JSON.stringify({ value }) });
  }
  getFinanceReport(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any }>(`/api/admin/reports/finance${qs}`);
  }
  getAdminTransactions(filters?: Record<string, string>) {
    const params = new URLSearchParams(filters).toString();
    return this.request<{ data: { transactions: any[] } }>(`/api/transactions?${params}`);
  }
  flagTransaction(id: string, reason: string) {
    return this.request('/api/admin/transactions/' + id + '/flag', { method: 'POST', body: JSON.stringify({ reason }) });
  }

  // Seller Dashboard
  getSellerAnalytics() {
    return this.request<{ data: any }>('/api/seller/analytics');
  }
  getSellerTrustScore(sellerId?: string) {
    const qs = sellerId ? `?seller_id=${sellerId}` : '';
    return this.request<{ data: any }>(`/api/seller/trust-score${qs}`);
  }
  getTransactionReceipts(txnId: string) {
    return this.request<{ data: any[] }>(`/api/seller/receipts/${txnId}`);
  }
  submitSellerVerification(data: Record<string, unknown>) {
    return this.request<{ data: any }>('/api/seller/verify', { method: 'POST', body: JSON.stringify(data) });
  }
  getVerificationStatus() {
    return this.request<{ data: any }>('/api/seller/verification-status');
  }

  // Public
  getPlatformStats() {
    return this.request<{ data: any }>('/api/public/stats');
  }
  calculateFees(amount: number, delivery: number) {
    return this.request<{ data: any }>(`/api/public/fee-calculator?amount=${amount}&delivery=${delivery}`);
  }
  getSellerReputation(phone: string) {
    return this.request<{ data: any }>(`/api/public/seller/${encodeURIComponent(phone)}/reputation`);
  }
}

export const api = new ApiClient();

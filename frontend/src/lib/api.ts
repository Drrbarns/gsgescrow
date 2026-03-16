import { API_URL } from './constants';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async getToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const { createClient } = await import('./supabase/browser');
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
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
    return this.request<{ data: any }>('/api/transactions', { method: 'POST', body: JSON.stringify(data) });
  }
  listTransactions(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[]; total: number }>(`/api/transactions${qs}`);
  }
  getTransaction(id: string) {
    return this.request<{ data: any }>(`/api/transactions/${id}`);
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
    return this.request<{ data: { transaction_id: string; short_id: string } }>('/api/payments/simulate', { method: 'POST', body: JSON.stringify({ transaction_id: transactionId }) });
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

import { API_URL } from './constants';

class ApiClient {
  private baseUrl: string;
  private readonly productionApiBase = 'https://api.sellbuysafe.gsgbrands.com';

  constructor() {
    this.baseUrl = (API_URL || '').replace(/\/+$/, '');
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

  private getImpersonationToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('sbs_impersonation_token');
  }

  private async getUserId(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const supabase = await this.getSupabase();
    const { data } = await supabase.auth.getUser();
    return data.user?.id || null;
  }

  private getDefaultPlatformSettings() {
    return [
      { key: 'buyer_fee_percent', value: '0.5', description: 'Buyer platform fee as percentage of product total' },
      { key: 'seller_fee_percent', value: '0.75', description: 'Seller platform fee as percentage of product total' },
      { key: 'rider_release_fee', value: '1.00', description: 'Fixed rider release fee in GHS' },
      { key: 'delivery_code_length', value: '7', description: 'Length of delivery code' },
      { key: 'partial_code_length', value: '4', description: 'Length of partial code' },
      { key: 'code_expiry_hours', value: '72', description: 'Hours before codes expire' },
      { key: 'max_code_attempts', value: '5', description: 'Maximum code verification attempts before lockout' },
      { key: 'lockout_minutes', value: '30', description: 'Lockout duration in minutes after max attempts' },
      { key: 'payout_max_retries', value: '5', description: 'Maximum payout retry attempts' },
      { key: 'auto_release_hours', value: '72', description: 'Hours after delivery to auto-release funds' },
      { key: 'whatsapp_support_number', value: '+233000000000', description: 'WhatsApp support number' },
      { key: 'auto_release_enabled', value: 'true', description: 'Enable automatic fund release after delivery' },
      { key: 'seller_verification_required', value: 'false', description: 'Require seller verification for payouts above threshold' },
      { key: 'seller_verification_threshold', value: '5000', description: 'GHS threshold requiring seller verification' },
      { key: 'kyc_required_buyer', value: 'true', description: 'Require buyer KYC for risk-gated features' },
      { key: 'kyc_required_seller', value: 'true', description: 'Require seller KYC for payout and trust badge' },
      { key: 'kyc_auto_approve', value: 'false', description: 'Allow automatic approval for low-risk KYC requests' },
      { key: 'kyc_block_on_reject', value: 'true', description: 'Prevent high-trust actions until KYC is resubmitted' },
      { key: 'kyc_expiry_days', value: '365', description: 'Number of days before approved KYC expires' },
      { key: 'fraud_detection_enabled', value: 'true', description: 'Enable automated fraud scoring' },
      { key: 'fraud_auto_hold_score', value: '75', description: 'Auto-hold transactions with fraud score above this' },
    ];
  }

  private mergeWithDefaultSettings(settings: any[]) {
    const defaults = this.getDefaultPlatformSettings();
    const map = new Map((settings || []).map((s: any) => [s.key, s]));
    for (const def of defaults) {
      if (!map.has(def.key)) {
        map.set(def.key, def);
      }
    }
    return Array.from(map.values()).sort((a, b) => String(a.key).localeCompare(String(b.key)));
  }

  private normalizePath(path: string) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  private getFallbackBaseUrls() {
    if (typeof window === 'undefined') return [] as string[];
    const host = window.location.hostname;
    const urls: string[] = [];

    // If frontend is on the public brand host, backend is expected on api subdomain.
    if (host === 'sellbuysafe.gsgbrands.com' || host.endsWith('.sellbuysafe.gsgbrands.com')) {
      urls.push(this.productionApiBase);
    }

    return Array.from(new Set(urls.map((u) => u.replace(/\/+$/, ''))));
  }

  private isLikelyHtmlPayload(text: string) {
    const trimmed = text.trim().toLowerCase();
    return trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html') || trimmed.includes('<head');
  }

  private async doFetchJson<T>(requestUrl: string, options: RequestInit): Promise<T> {
    const res = await fetch(requestUrl, options);
    const contentType = res.headers.get('content-type') || '';
    let payload: any = null;

    if (contentType.includes('application/json')) {
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }
    } else {
      const text = await res.text();
      const trimmed = text.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          payload = JSON.parse(trimmed);
        } catch {
          payload = null;
        }
      } else if (this.isLikelyHtmlPayload(trimmed)) {
        payload = { error: `Invalid API response from ${requestUrl}. API route returned HTML.` };
      } else {
        payload = { error: `Invalid API response from ${requestUrl}. Check NEXT_PUBLIC_API_URL and backend routing.` };
      }
    }

    if (!res.ok) {
      throw new Error(payload?.error || `Request failed (${res.status})`);
    }
    if (!payload) {
      throw new Error(`Empty or invalid response from ${requestUrl}`);
    }
    return payload as T;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken();
    const impersonationToken = this.getImpersonationToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (impersonationToken) headers['x-impersonation-token'] = impersonationToken;

    const normalizedPath = this.normalizePath(path);
    const requestOptions: RequestInit = {
      ...options,
      headers,
    };

    const primaryUrl = this.baseUrl ? `${this.baseUrl}${normalizedPath}` : normalizedPath;
    try {
      return await this.doFetchJson<T>(primaryUrl, requestOptions);
    } catch (primaryErr) {
      // If explicit API host fails and we're on browser, retry same-origin API once first.
      if (typeof window !== 'undefined' && this.baseUrl) {
        try {
          return await this.doFetchJson<T>(normalizedPath, requestOptions);
        } catch {
          // continue to additional fallbacks below
        }
      }

      const fallbacks = this.getFallbackBaseUrls();
      for (const fallbackBase of fallbacks) {
        if (fallbackBase === this.baseUrl) continue;
        try {
          return await this.doFetchJson<T>(`${fallbackBase}${normalizedPath}`, requestOptions);
        } catch {
          // try next fallback
        }
      }

      throw primaryErr;
    }
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
        const buyerFeePercent = 0.35;
        const pt = Number(data.product_total) || 0;
        const df = Number(data.delivery_fee) || 0;
        const riderReleaseFee = df > 0 ? 1.0 : 0.0;
        const buyerPlatformFee = parseFloat((pt * buyerFeePercent / 100).toFixed(2));
        const sellerPlatformFee = parseFloat((pt * 0.65 / 100).toFixed(2));
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
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', uid)
          .single();
        const isAdmin = profileData?.role === 'admin' || profileData?.role === 'superadmin';
        const { data: userData } = await supabase.auth.getUser();
        const userPhone = userData.user?.phone || '';
        const userEmail = userData.user?.email || '';
        let query = supabase
          .from('transactions')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });
        if (!isAdmin) {
          const orFilters = [`buyer_id.eq.${uid}`, `seller_id.eq.${uid}`];
          if (userPhone) orFilters.push(`seller_phone.eq.${userPhone}`);
          if (userEmail) orFilters.push(`seller_phone.eq.${userEmail}`);
          query = query.or(orFilters.join(','));
        }
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
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>(`/api/transactions/${id}/dispatch`, { method: 'POST', body: JSON.stringify(data) }),
      async () => {
        const supabase = await this.getSupabase();
        const uid = await this.getUserId();
        if (!uid) throw new Error('Not authenticated');
        const { error } = await supabase.from('transactions').update({
          seller_id: uid,
          status: 'DISPATCHED',
          dispatched_at: new Date().toISOString(),
          seller_business_location: data.seller_business_location,
          rider_name: data.rider_name,
          rider_phone: data.rider_phone,
          rider_telco: data.rider_telco,
          pickup_address: data.pickup_address,
          additional_info: data.additional_info,
          seller_payout_destination: data.seller_payout_destination,
        }).eq('id', id);
        if (error) throw new Error(error.message);
        const partialCode = 'SIM0';
        await supabase.from('transaction_codes').update({
          partial_code_hash: '$2a$10$sim_partial_placeholder',
          partial_code_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        }).eq('transaction_id', id);
        return { data: { partial_code: partialCode, message: 'Dispatch confirmed (simulated).' } };
      }
    );
  }
  verifyDelivery(id: string, deliveryCode: string) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>(`/api/transactions/${id}/verify-delivery`, { method: 'POST', body: JSON.stringify({ delivery_code: deliveryCode }) }),
      async () => {
        const supabase = await this.getSupabase();
        await supabase.from('transactions').update({
          status: 'DELIVERED_CONFIRMED',
          delivered_at: new Date().toISOString(),
        }).eq('id', id);
        return { data: { message: 'Delivery confirmed (simulated).' } };
      }
    );
  }
  requestReplacement(id: string) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>(`/api/transactions/${id}/request-replacement`, { method: 'POST' }),
      async () => {
        const supabase = await this.getSupabase();
        await supabase.from('transactions').update({ status: 'REPLACEMENT_PENDING' }).eq('id', id);
        return { data: { message: 'Replacement requested (simulated).' } };
      }
    );
  }
  trackTransaction(query: string) {
    return this.requestWithFallback<{ data: any[] }>(
      () => this.request<{ data: any[] }>(`/api/transactions/track/${encodeURIComponent(query)}`),
      async () => {
        const supabase = await this.getSupabase();
        const { data } = await supabase.from('transactions')
          .select('short_id, status, product_name, product_type, created_at, dispatched_at, delivered_at, completed_at')
          .or(`short_id.ilike.%${query}%,buyer_phone.ilike.%${query}%,seller_phone.ilike.%${query}%`)
          .order('created_at', { ascending: false }).limit(10);
        return { data: data || [] };
      }
    );
  }

  // Payments
  initiatePayment(transactionId: string) {
    return this.request<{ data: { authorization_url: string; reference: string; access_code?: string | null; provider?: string } }>('/api/payments/initiate', { method: 'POST', body: JSON.stringify({ transaction_id: transactionId }) });
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
    return this.requestWithFallback<{ data: { delivery_code: string } }>(
      () => this.request<{ data: { delivery_code: string } }>(`/api/transactions/${transactionId}/simulation-delivery-code`),
      async () => ({ data: { delivery_code: 'SIM0000' } })
    );
  }

  // Payouts
  payRider(data: { transaction_id: string; rider_momo_number: string; delivery_code: string }) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>('/api/payouts/rider', { method: 'POST', body: JSON.stringify(data) }),
      async () => {
        const supabase = await this.getSupabase();
        await supabase.from('transactions').update({
          rider_momo_number: data.rider_momo_number,
          status: 'DELIVERED_PENDING',
        }).eq('id', data.transaction_id);
        return { data: { message: 'Rider payout simulated', payout_id: 'sim_' + Date.now() } };
      }
    );
  }
  paySeller(data: { transaction_id: string; delivery_code: string; partial_code: string }) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>('/api/payouts/seller', { method: 'POST', body: JSON.stringify(data) }),
      async () => {
        const supabase = await this.getSupabase();
        const { data: txn } = await supabase.from('transactions').select('product_total, seller_platform_fee').eq('id', data.transaction_id).single();
        const amount = txn ? parseFloat(txn.product_total) - parseFloat(txn.seller_platform_fee) : 0;
        await supabase.from('transactions').update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
        }).eq('id', data.transaction_id);
        return { data: { message: 'Seller payout simulated', amount } };
      }
    );
  }
  listPayouts(params?: Record<string, string>) {
    return this.requestWithFallback<{ data: any[]; total: number }>(
      () => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: any[]; total: number }>(`/api/payouts${qs}`);
      },
      async () => {
        try {
          const supabase = await this.getSupabase();
          const page = parseInt(params?.page || '1', 10);
          const limit = parseInt(params?.limit || '20', 10);
          const from = (page - 1) * limit;

          let query = supabase.from('payouts').select('*', { count: 'exact' }).order('created_at', { ascending: false });
          if (params?.status) query = query.eq('status', params.status);
          if (params?.type) query = query.eq('type', params.type);

          const { data: payouts, count } = await query.range(from, from + limit - 1);
          const txIds = [...new Set((payouts || []).map((p: any) => p.transaction_id).filter(Boolean))];
          const { data: txs } = txIds.length
            ? await supabase.from('transactions').select('id, short_id, product_name, seller_name, buyer_name').in('id', txIds)
            : { data: [] as any[] };
          const txMap = new Map((txs || []).map((t: any) => [t.id, t]));
          const rows = (payouts || []).map((p: any) => ({ ...p, transactions: txMap.get(p.transaction_id) || null }));
          return { data: rows, total: count || 0 };
        } catch {
          return { data: [], total: 0 };
        }
      }
    );
  }
  holdPayout(id: string, reason: string) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>('/api/payouts/' + id + '/hold', { method: 'POST', body: JSON.stringify({ reason }) }),
      async () => {
        const supabase = await this.getSupabase();
        const { error } = await supabase.from('payouts').update({ status: 'HELD', hold_reason: reason }).eq('id', id);
        if (error) throw new Error(error.message);
        return { data: { ok: true } };
      }
    );
  }
  releasePayout(id: string) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>('/api/payouts/' + id + '/release', { method: 'POST' }),
      async () => {
        const supabase = await this.getSupabase();
        const { error } = await supabase.from('payouts').update({ status: 'QUEUED' }).eq('id', id);
        if (error) throw new Error(error.message);
        return { data: { ok: true } };
      }
    );
  }
  retryPayout(id: string) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>('/api/payouts/' + id + '/retry', { method: 'POST' }),
      async () => {
        const supabase = await this.getSupabase();
        const { error } = await supabase.from('payouts').update({ status: 'QUEUED', attempts: 0 }).eq('id', id);
        if (error) throw new Error(error.message);
        return { data: { ok: true } };
      }
    );
  }

  // Disputes
  openDispute(data: { transaction_id: string; reason: string }) {
    return this.request<{ data: any }>('/api/disputes', { method: 'POST', body: JSON.stringify(data) });
  }
  listDisputes(params?: Record<string, string>) {
    return this.requestWithFallback<{ data: any[]; total: number }>(
      () => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: any[]; total: number }>(`/api/disputes${qs}`);
      },
      async () => {
        try {
          const supabase = await this.getSupabase();
          const page = parseInt(params?.page || '1', 10);
          const limit = parseInt(params?.limit || '20', 10);
          const from = (page - 1) * limit;

          let query = supabase.from('disputes').select('*', { count: 'exact' }).order('created_at', { ascending: false });
          if (params?.status) query = query.eq('status', params.status);
          const { data, count } = await query.range(from, from + limit - 1);
          const txIds = [...new Set((data || []).map((d: any) => d.transaction_id).filter(Boolean))];
          const { data: txs } = txIds.length
            ? await supabase.from('transactions').select('id, short_id, product_name, seller_name, buyer_name').in('id', txIds)
            : { data: [] as any[] };
          const txMap = new Map((txs || []).map((t: any) => [t.id, t]));
          const rows = (data || []).map((d: any) => ({ ...d, transactions: txMap.get(d.transaction_id) || null }));
          return { data: rows, total: count || 0 };
        } catch {
          return { data: [], total: 0 };
        }
      }
    );
  }
  getDispute(id: string) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>(`/api/disputes/${id}`),
      async () => {
        const supabase = await this.getSupabase();
        const { data: dispute, error } = await supabase.from('disputes').select('*').eq('id', id).single();
        if (error) throw new Error(error.message);
        const [{ data: txn }, { data: evidence }] = await Promise.all([
          supabase.from('transactions').select('id, short_id, product_name, seller_name, buyer_name').eq('id', dispute.transaction_id).single(),
          supabase.from('dispute_evidence').select('*').eq('dispute_id', id).order('created_at', { ascending: false }),
        ]);
        return { data: { ...dispute, transactions: txn || null, dispute_evidence: evidence || [] } };
      }
    );
  }
  uploadEvidence(disputeId: string, data: Record<string, unknown>) {
    return this.request('/api/disputes/' + disputeId + '/evidence', { method: 'POST', body: JSON.stringify(data) });
  }
  resolveDispute(id: string, data: Record<string, unknown>) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>('/api/disputes/' + id + '/resolve', { method: 'POST', body: JSON.stringify(data) }),
      async () => {
        const supabase = await this.getSupabase();
        const payload: Record<string, unknown> = {
          status: 'RESOLVED',
          resolved_at: new Date().toISOString(),
        };
        if (typeof data.resolution === 'string') payload.resolution = data.resolution;
        if (typeof data.notes === 'string') payload.notes = data.notes;
        if (typeof data.resolution_action === 'string') payload.resolution_action = data.resolution_action;
        const { error } = await supabase.from('disputes').update(payload).eq('id', id);
        if (error) throw new Error(error.message);
        return { data: { ok: true } };
      }
    );
  }

  // Reviews
  createReview(data: Record<string, unknown>) {
    return this.request<{ data: any }>('/api/reviews', { method: 'POST', body: JSON.stringify(data) });
  }
  listReviews(params?: Record<string, string>) {
    return this.requestWithFallback<{ data: any[]; total: number }>(
      () => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: any[]; total: number }>(`/api/reviews${qs}`);
      },
      async () => {
        try {
          const supabase = await this.getSupabase();
          const page = parseInt(params?.page || '1', 10);
          const limit = parseInt(params?.limit || '20', 10);
          const from = (page - 1) * limit;

          let query = supabase.from('reviews').select('*', { count: 'exact' }).order('created_at', { ascending: false });
          if (params?.status) query = query.eq('status', params.status);
          const { data, count } = await query.range(from, from + limit - 1);
          const txIds = [...new Set((data || []).map((r: any) => r.transaction_id).filter(Boolean))];
          const { data: txs } = txIds.length
            ? await supabase.from('transactions').select('id, product_name, seller_name').in('id', txIds)
            : { data: [] as any[] };
          const txMap = new Map((txs || []).map((t: any) => [t.id, t]));
          const rows = (data || []).map((r: any) => ({ ...r, transactions: txMap.get(r.transaction_id) || null }));
          return { data: rows, total: count || 0 };
        } catch {
          return { data: [], total: 0 };
        }
      }
    );
  }
  moderateReview(id: string, status: string) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>('/api/reviews/' + id + '/moderate', { method: 'POST', body: JSON.stringify({ status }) }),
      async () => {
        const supabase = await this.getSupabase();
        const { error } = await supabase.from('reviews').update({ status, moderated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw new Error(error.message);
        return { data: { ok: true } };
      }
    );
  }

  // Admin
  getDashboard() {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>('/api/admin/dashboard'),
      async () => ({ data: { transactions: { total: 0, by_status: {} }, payouts: { total: 0, total_amount: 0, by_status: {} }, disputes: { total: 0, by_status: {} }, revenue: { total_platform_fees: 0 } } })
    );
  }
  getAdminUsers(params?: Record<string, string>) {
    return this.requestWithFallback<{ data: any[]; total: number; page: number; limit: number }>(
      () => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: any[]; total: number; page: number; limit: number }>(`/api/admin/users${qs}`);
      },
      async () => {
        const supabase = await this.getSupabase();
        const role = params?.role;
        const search = (params?.search || '').trim();
        const page = parseInt(params?.page || '1', 10);
        const limit = parseInt(params?.limit || '25', 10);
        const from = (page - 1) * limit;

        let query = supabase
          .from('profiles')
          .select('user_id, full_name, phone, role, created_at, updated_at', { count: 'exact' })
          .order('updated_at', { ascending: false });

        if (role && role !== 'all') query = query.eq('role', role);
        if (search) query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);

        const { data, count } = await query.range(from, from + limit - 1);
        return { data: data || [], total: count || 0, page, limit };
      }
    );
  }
  getAdminUserDetails(userId: string) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>(`/api/admin/users/${userId}`),
      async () => {
        const supabase = await this.getSupabase();
        const [profileRes, txRes, payoutRes, disputeRes, reviewRes, trustRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', userId).single(),
          supabase.from('transactions').select('*').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order('created_at', { ascending: false }).limit(100),
          supabase.from('payouts').select('*').order('created_at', { ascending: false }).limit(100),
          supabase.from('disputes').select('*').eq('opened_by', userId).order('created_at', { ascending: false }).limit(100),
          supabase.from('reviews').select('*').eq('buyer_id', userId).order('created_at', { ascending: false }).limit(100),
          supabase.from('seller_trust_scores').select('*').eq('seller_id', userId).single(),
        ]);

        const transactions = txRes.data || [];
        const payouts = (payoutRes.data || []).filter((p: any) => transactions.some((t: any) => t.id === p.transaction_id));
        const disputes = disputeRes.data || [];
        const reviews = reviewRes.data || [];

        return {
          data: {
            profile: profileRes.data,
            aggregates: {
              total_transactions: transactions.length,
              completed_transactions: transactions.filter((t: any) => t.status === 'COMPLETED').length,
              active_transactions: transactions.filter((t: any) => !['COMPLETED', 'CANCELLED'].includes(t.status)).length,
              total_volume_ghs: transactions.reduce((sum: number, t: any) => sum + Number(t.grand_total || 0), 0),
              disputes_opened: disputes.length,
              payouts_total: payouts.length,
              reviews_total: reviews.length,
            },
            trust_score: trustRes.data || null,
            transactions,
            payouts,
            disputes,
            reviews,
          },
        };
      }
    );
  }
  updateAdminUserRole(userId: string, role: 'buyer' | 'seller' | 'admin' | 'superadmin') {
    return this.request<{ data: { ok: boolean; role: string } }>(`/api/admin/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }
  startImpersonation(targetUserId: string, reason: string, expiresMinutes = 30) {
    return this.request<{ data: any }>('/api/admin/impersonation/start', {
      method: 'POST',
      body: JSON.stringify({ target_user_id: targetUserId, reason, expires_minutes: expiresMinutes }),
    });
  }
  stopImpersonation(sessionToken?: string, reason?: string) {
    return this.request<{ data: { ok: boolean } }>('/api/admin/impersonation/stop', {
      method: 'POST',
      body: JSON.stringify({ session_token: sessionToken, reason }),
    });
  }
  getCurrentImpersonation() {
    return this.request<{ data: any | null }>('/api/admin/impersonation/current');
  }
  getAdminSessions() {
    return this.requestWithFallback<{ data: { impersonations: any[]; admin_sessions: any[] } }>(
      () => this.request<{ data: { impersonations: any[]; admin_sessions: any[] } }>('/api/admin/sessions'),
      async () => {
        try {
          const supabase = await this.getSupabase();
          const [impRes, sessRes] = await Promise.all([
            supabase.from('impersonation_sessions').select('*').order('started_at', { ascending: false }).limit(20),
            supabase.from('admin_sessions').select('*').order('started_at', { ascending: false }).limit(20),
          ]);
          return { data: { impersonations: impRes.data || [], admin_sessions: sessRes.data || [] } };
        } catch {
          return { data: { impersonations: [], admin_sessions: [] } };
        }
      }
    );
  }
  listSavedViews(viewType?: string) {
    const qs = viewType ? `?view_type=${encodeURIComponent(viewType)}` : '';
    return this.request<{ data: any[] }>(`/api/admin/saved-views${qs}`);
  }
  createSavedView(payload: Record<string, unknown>) {
    return this.request<{ data: any }>('/api/admin/saved-views', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
  updateSavedView(id: string, payload: Record<string, unknown>) {
    return this.request<{ data: any }>(`/api/admin/saved-views/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }
  deleteSavedView(id: string) {
    return this.request<{ data: { ok: boolean } }>(`/api/admin/saved-views/${id}`, { method: 'DELETE' });
  }
  bulkTransactions(action: 'hold' | 'release', ids: string[]) {
    return this.request<{ data: { updated: number } }>('/api/admin/bulk/transactions', {
      method: 'POST',
      body: JSON.stringify({ action, ids }),
    });
  }
  bulkPayouts(action: 'hold' | 'release' | 'retry', ids: string[], reason?: string) {
    return this.request<{ data: { updated: number } }>('/api/admin/bulk/payouts', {
      method: 'POST',
      body: JSON.stringify({ action, ids, reason }),
    });
  }
  bulkDisputes(action: 'under_review' | 'resolve' | 'reject', ids: string[]) {
    return this.request<{ data: { updated: number } }>('/api/admin/bulk/disputes', {
      method: 'POST',
      body: JSON.stringify({ action, ids }),
    });
  }
  getAlertRules() {
    return this.requestWithFallback<{ data: any[] }>(
      () => this.request<{ data: any[] }>('/api/admin/alert-rules'),
      async () => {
        try {
          const supabase = await this.getSupabase();
          const { data } = await supabase.from('admin_alert_rules').select('*').order('key', { ascending: true });
          return { data: data || [] };
        } catch {
          return { data: [] };
        }
      }
    );
  }
  updateAlertRule(key: string, payload: Record<string, unknown>) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>(`/api/admin/alert-rules/${key}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
      async () => {
        const supabase = await this.getSupabase();
        const { data, error } = await supabase.from('admin_alert_rules').update(payload).eq('key', key).select().single();
        if (error) throw new Error(error.message);
        return { data };
      }
    );
  }
  getAlertEvents(status = 'all') {
    return this.requestWithFallback<{ data: any[] }>(
      () => this.request<{ data: any[] }>(`/api/admin/alerts/events?status=${encodeURIComponent(status)}`),
      async () => {
        try {
          const supabase = await this.getSupabase();
          let query = supabase.from('admin_alert_events').select('*').order('created_at', { ascending: false });
          if (status && status !== 'all') query = query.eq('status', status);
          const { data } = await query.limit(100);
          return { data: data || [] };
        } catch {
          return { data: [] };
        }
      }
    );
  }
  acknowledgeAlertEvent(id: string) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>(`/api/admin/alerts/events/${id}/ack`, { method: 'POST' }),
      async () => {
        const supabase = await this.getSupabase();
        const { data, error } = await supabase
          .from('admin_alert_events')
          .update({ status: 'ACKNOWLEDGED', acknowledged_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return { data };
      }
    );
  }
  getExportJobs(params?: Record<string, string>) {
    return this.requestWithFallback<{ data: any[]; total: number; page: number; limit: number }>(
      () => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: any[]; total: number; page: number; limit: number }>(`/api/admin/export/jobs${qs}`);
      },
      async () => {
        try {
          const supabase = await this.getSupabase();
          const page = parseInt(params?.page || '1', 10);
          const limit = parseInt(params?.limit || '20', 10);
          const from = (page - 1) * limit;
          const { data, count } = await supabase
            .from('admin_export_jobs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, from + limit - 1);
          return { data: data || [], total: count || 0, page, limit };
        } catch {
          const page = parseInt(params?.page || '1', 10);
          const limit = parseInt(params?.limit || '20', 10);
          return { data: [], total: 0, page, limit };
        }
      }
    );
  }
  createExportJob(exportType: string, filters?: Record<string, unknown>) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>('/api/admin/export/jobs', {
        method: 'POST',
        body: JSON.stringify({ export_type: exportType, filters: filters || {} }),
      }),
      async () => {
        const supabase = await this.getSupabase();
        const { data, error } = await supabase
          .from('admin_export_jobs')
          .insert({
            export_type: exportType,
            filters: filters || {},
            status: 'QUEUED',
            requested_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw new Error(error.message);
        return { data };
      }
    );
  }
  getAdminAnalyticsOverview() {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>('/api/admin/analytics/overview'),
      async () => ({ data: { gmv: 0, escrow_held_value: 0, dispute_rate_percent: 0, payout_failure_rate_percent: 0, avg_dispute_resolution_hours: 0, open_alerts: 0 } })
    );
  }
  getOpsReliabilityOverview() {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>('/api/admin/ops/reliability'),
      async () => ({ data: { redis: { ok: false, message: 'Unavailable' }, queue_health: [], dead_letters: { count_1h: 0, count_24h: 0, latest: [] }, sms: { sent_1h: 0, failed_1h: 0, failure_rate_1h_pct: 0, sent_24h: 0, failed_24h: 0, failure_rate_24h_pct: 0 } } })
    );
  }
  getOpsRuntimeLogs(params?: Record<string, string>) {
    return this.requestWithFallback<{ data: any[] }>(
      () => {
        const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
        return this.request<{ data: any[] }>(`/api/admin/ops/logs${qs}`);
      },
      async () => ({ data: [] })
    );
  }
  getAuditLogs(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[]; total: number }>(`/api/admin/audit-logs${qs}`);
  }
  getSettings() {
    return this.requestWithFallback<{ data: any[] }>(
      async () => {
        const res = await this.request<{ data: any[] }>('/api/admin/settings');
        return { data: this.mergeWithDefaultSettings(res.data || []) };
      },
      async () => {
        try {
          const supabase = await this.getSupabase();
          const { data } = await supabase.from('platform_settings').select('*').order('key', { ascending: true });
          return { data: this.mergeWithDefaultSettings(data || []) };
        } catch {
          return { data: this.getDefaultPlatformSettings() };
        }
      }
    );
  }
  updateSetting(key: string, value: string) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>('/api/admin/settings/' + key, { method: 'PUT', body: JSON.stringify({ value }) }),
      async () => {
        const supabase = await this.getSupabase();
        const { data, error } = await supabase
          .from('platform_settings')
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
          .select()
          .single();
        if (error) throw new Error(error.message);
        return { data };
      }
    );
  }
  getFinanceReport(params?: Record<string, string>) {
    return this.requestWithFallback<{ data: any }>(
      () => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<{ data: any }>(`/api/admin/reports/finance${qs}`);
      },
      async () => {
        try {
          const supabase = await this.getSupabase();
          let txQuery = supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(500);
          let payoutQuery = supabase.from('payouts').select('*').order('created_at', { ascending: false }).limit(500);
          if (params?.from) {
            txQuery = txQuery.gte('created_at', params.from);
            payoutQuery = payoutQuery.gte('created_at', params.from);
          }
          if (params?.to) {
            txQuery = txQuery.lte('created_at', params.to);
            payoutQuery = payoutQuery.lte('created_at', params.to);
          }
          const [txRes, payoutRes] = await Promise.all([txQuery, payoutQuery]);
          return { data: { transactions: txRes.data || [], payouts: payoutRes.data || [] } };
        } catch {
          return { data: { transactions: [], payouts: [] } };
        }
      }
    );
  }
  getAdminTransactions(filters?: Record<string, string>) {
    const params = new URLSearchParams(filters || {}).toString();
    return this.request<{ data: any[]; total: number }>(`/api/transactions?${params}`);
  }
  flagTransaction(id: string, reason: string) {
    return this.request('/api/admin/transactions/' + id + '/flag', { method: 'POST', body: JSON.stringify({ reason }) });
  }
  overrideFraudScore(id: string, score: number, note?: string) {
    return this.request<{ data: any }>(`/api/admin/fraud/${id}/override-score`, {
      method: 'POST',
      body: JSON.stringify({ score, note }),
    });
  }
  addFraudCaseNote(id: string, note: string) {
    return this.request<{ data: any }>(`/api/admin/fraud/${id}/case-note`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }
  listAdminVerifications(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.requestWithFallback<{ data: any[] }>(
      () => this.request<{ data: any[] }>(`/api/admin/verifications${qs}`),
      async () => {
        try {
          const supabase = await this.getSupabase();
          let query = supabase.from('kyc_verifications').select('*').order('created_at', { ascending: false });
          if (params?.role && params.role !== 'all') query = query.eq('user_role', params.role);
          if (params?.status && params.status !== 'all') query = query.eq('status', params.status);
          if (params?.search) query = query.or(`full_name.ilike.%${params.search}%,id_number.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
          const { data } = await query.limit(300);
          return { data: data || [] };
        } catch {
          return { data: [] };
        }
      }
    );
  }
  approveAdminVerification(id: string, notes?: string) {
    return this.request<{ data: any }>(`/api/admin/verifications/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }
  rejectAdminVerification(id: string, reason: string) {
    return this.request<{ data: any }>(`/api/admin/verifications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }
  updateAdminVerificationStatus(id: string, status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION', reason?: string, notes?: string) {
    return this.request<{ data: any }>(`/api/admin/verifications/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason, notes }),
    });
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
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>('/api/seller/kyc', { method: 'POST', body: JSON.stringify({ ...data, user_role: 'seller' }) }),
      () => this.request<{ data: any }>('/api/seller/verify', { method: 'POST', body: JSON.stringify(data) })
    );
  }
  getVerificationStatus() {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>('/api/seller/kyc-status'),
      () => this.request<{ data: any }>('/api/seller/verification-status')
    );
  }
  submitBuyerVerification(data: Record<string, unknown>) {
    return this.request<{ data: any }>('/api/seller/kyc', { method: 'POST', body: JSON.stringify({ ...data, user_role: 'buyer' }) });
  }
  getBuyerVerificationStatus() {
    return this.request<{ data: any }>('/api/seller/kyc-status');
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

  // Marketplace
  listMarketplaceListings(params?: Record<string, string>) {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.requestWithFallback<{ data: any[]; total: number; page: number; limit: number }>(
      () => this.request<{ data: any[]; total: number; page: number; limit: number }>(`/api/marketplace/listings${qs}`),
      async () => {
        try {
          const supabase = await this.getSupabase();
          const page = parseInt(params?.page || '1', 10);
          const limit = parseInt(params?.limit || '20', 10);
          const from = (page - 1) * limit;
          let query = supabase
            .from('marketplace_listings')
            .select('*', { count: 'exact' })
            .eq('status', 'PUBLISHED')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
          if (params?.type && ['product', 'service'].includes(params.type)) query = query.eq('listing_type', params.type);
          if (params?.category && params.category !== 'all') query = query.eq('category', params.category);
          if (params?.seller_id) query = query.eq('seller_id', params.seller_id);
          if (params?.search) query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
          if (params?.min_price) query = query.gte('price', Number(params.min_price));
          if (params?.max_price) query = query.lte('price', Number(params.max_price));
          if (params?.sort === 'price_asc') query = query.order('price', { ascending: true });
          if (params?.sort === 'price_desc') query = query.order('price', { ascending: false });
          const { data, count } = await query.range(from, from + limit - 1);
          const sellerIds = [...new Set((data || []).map((row: any) => row.seller_id).filter(Boolean))];
          const { data: profiles } = sellerIds.length
            ? await supabase.from('profiles').select('user_id, full_name, phone').in('user_id', sellerIds)
            : { data: [] as any[] };
          const profileMap = new Map((profiles || []).map((profile: any) => [profile.user_id, profile]));
          const rows = (data || []).map((row: any) => ({
            ...row,
            seller: profileMap.get(row.seller_id) || null,
          }));
          return { data: rows, total: count || 0, page, limit };
        } catch {
          const page = parseInt(params?.page || '1', 10);
          const limit = parseInt(params?.limit || '20', 10);
          return { data: [], total: 0, page, limit };
        }
      }
    );
  }

  getMarketplaceListing(id: string) {
    return this.requestWithFallback<{ data: any }>(
      () => this.request<{ data: any }>(`/api/marketplace/listings/${id}`),
      async () => {
        const supabase = await this.getSupabase();
        const { data, error } = await supabase.from('marketplace_listings').select('*').eq('id', id).single();
        if (error || !data) throw new Error('Listing not found');
        const { data: profile } = await supabase.from('profiles').select('user_id, full_name, phone').eq('user_id', data.seller_id).single();
        return { data: { ...data, seller: profile || null } };
      }
    );
  }

  listMyMarketplaceListings(params?: Record<string, string>) {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.requestWithFallback<{ data: any[]; total: number; page: number; limit: number }>(
      () => this.request<{ data: any[]; total: number; page: number; limit: number }>(`/api/marketplace/seller/my-listings${qs}`),
      async () => {
        try {
          const supabase = await this.getSupabase();
          const uid = await this.getUserId();
          if (!uid) throw new Error('Not authenticated');
          const page = parseInt(params?.page || '1', 10);
          const limit = parseInt(params?.limit || '20', 10);
          const from = (page - 1) * limit;
          let query = supabase
            .from('marketplace_listings')
            .select('*', { count: 'exact' })
            .eq('seller_id', uid)
            .order('created_at', { ascending: false });
          if (params?.status && params.status !== 'all') query = query.eq('status', params.status);
          if (params?.type && params.type !== 'all') query = query.eq('listing_type', params.type);
          const { data, count } = await query.range(from, from + limit - 1);
          return { data: data || [], total: count || 0, page, limit };
        } catch {
          const page = parseInt(params?.page || '1', 10);
          const limit = parseInt(params?.limit || '20', 10);
          return { data: [], total: 0, page, limit };
        }
      }
    );
  }

  createMarketplaceListing(payload: Record<string, unknown>) {
    return this.request<{ data: any }>('/api/marketplace/listings', { method: 'POST', body: JSON.stringify(payload) });
  }

  updateMarketplaceListing(id: string, payload: Record<string, unknown>) {
    return this.request<{ data: any }>(`/api/marketplace/listings/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  updateMarketplaceListingStatus(id: string, status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED') {
    return this.request<{ data: any }>(`/api/marketplace/listings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  }

  archiveMarketplaceListing(id: string) {
    return this.request<{ data: { ok: boolean } }>(`/api/marketplace/listings/${id}`, { method: 'DELETE' });
  }

  // Notifications
  getNotifications() {
    return this.requestWithFallback<{ data: any[] }>(
      () => this.request<{ data: any[] }>('/api/auth/notifications'),
      async () => {
        const supabase = await this.getSupabase();
        const uid = await this.getUserId();
        if (!uid) return { data: [] };
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(50);
        return { data: data || [] };
      }
    );
  }

  markNotificationsReadAll() {
    return this.request<{ data: { ok: boolean } }>('/api/auth/notifications/read-all', { method: 'POST' });
  }
}

export const api = new ApiClient();

import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdminRole, requireSuperadmin } from '../middleware/auth';
import { supabaseAdmin, auditLog } from '../services/supabase';
import { getQueueHealth, pingRedis, payoutQueue } from '../services/queue';
import { processPayoutInline } from '../services/payout-inline';
import { sendNotification } from '../services/notify';
import { randomBytes } from 'crypto';
import rateLimit from 'express-rate-limit';

const router = Router();
const adminAuth = [authenticateToken, requireAdminRole];
const sensitiveAdminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sensitive admin actions. Please slow down.' },
});

// GET /api/admin/dashboard - KPI summary
router.get('/dashboard', ...adminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [txnResult, payoutResult, disputeResult, revenueResult] = await Promise.all([
      supabaseAdmin.from('transactions').select('status', { count: 'exact', head: false }),
      supabaseAdmin.from('payouts').select('status, amount', { count: 'exact', head: false }),
      supabaseAdmin.from('disputes').select('status', { count: 'exact', head: false }),
      supabaseAdmin.from('ledger_entries').select('bucket, direction, amount').eq('bucket', 'PLATFORM'),
    ]);

    const transactions = txnResult.data || [];
    const payouts = payoutResult.data || [];
    const disputes = disputeResult.data || [];
    const platformLedger = revenueResult.data || [];

    const totalRevenue = platformLedger
      .filter((e: any) => e.direction === 'CREDIT')
      .reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0);

    const statusCounts: Record<string, number> = {};
    transactions.forEach((t: any) => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });

    const payoutStatusCounts: Record<string, number> = {};
    const totalPayoutAmount = payouts.reduce((sum: number, p: any) => {
      payoutStatusCounts[p.status] = (payoutStatusCounts[p.status] || 0) + 1;
      return p.status === 'SUCCESS' ? sum + parseFloat(p.amount) : sum;
    }, 0);

    const disputeStatusCounts: Record<string, number> = {};
    disputes.forEach((d: any) => {
      disputeStatusCounts[d.status] = (disputeStatusCounts[d.status] || 0) + 1;
    });

    res.json({
      data: {
        transactions: {
          total: transactions.length,
          by_status: statusCounts,
        },
        payouts: {
          total: payouts.length,
          total_amount: totalPayoutAmount,
          by_status: payoutStatusCounts,
        },
        disputes: {
          total: disputes.length,
          by_status: disputeStatusCounts,
        },
        revenue: {
          total_platform_fees: totalRevenue,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const action = req.query.action as string | undefined;
    const entity = req.query.entity as string | undefined;
    const page = (req.query.page as string) || '1';
    const limit = (req.query.limit as string) || '50';
    let query = supabaseAdmin.from('audit_logs').select('*', { count: 'exact' });

    if (action) query = query.eq('action', action as string);
    if (entity) query = query.eq('entity', entity as string);

    const pageNum = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const from = (pageNum - 1) * pageSize;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    res.json({ data, total: count, page: pageNum, limit: pageSize });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

// GET /api/admin/settings
router.get('/settings', ...adminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin.from('platform_settings').select('*');
    if (error) throw error;
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// PUT /api/admin/settings/:key
router.put('/settings/:key', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { value } = req.body;
    const { data: existing } = await supabaseAdmin
      .from('platform_settings').select('*').eq('key', req.params.key).single();

    await supabaseAdmin.from('platform_settings').upsert({
      key: req.params.key,
      value,
      updated_by: req.user!.id,
    });

    await auditLog({
      actor_id: req.user!.id, action: 'SETTING_UPDATED', entity: 'platform_settings',
      before_state: existing ? { value: existing.value } : undefined,
      after_state: { value },
      request_id: req.requestId,
    });

    res.json({ data: { message: 'Setting updated' } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// GET /api/admin/reports/finance
router.get('/reports/finance', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dateFrom = req.query.from as string | undefined;
    const dateTo = req.query.to as string | undefined;

    let txnQuery = supabaseAdmin.from('transactions')
      .select('id, short_id, buyer_name, seller_name, product_total, delivery_fee, buyer_platform_fee, seller_platform_fee, grand_total, status, created_at, completed_at');

    if (dateFrom) txnQuery = txnQuery.gte('created_at', dateFrom as string);
    if (dateTo) txnQuery = txnQuery.lte('created_at', dateTo as string);

    const { data: transactions } = await txnQuery.order('created_at', { ascending: false });

    let payoutQuery = supabaseAdmin.from('payouts')
      .select('id, transaction_id, type, amount, status, created_at, completed_at');

    if (dateFrom) payoutQuery = payoutQuery.gte('created_at', dateFrom as string);
    if (dateTo) payoutQuery = payoutQuery.lte('created_at', dateTo as string);

    const { data: payouts } = await payoutQuery.order('created_at', { ascending: false });

    res.json({ data: { transactions: transactions || [], payouts: payouts || [] } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// POST /api/admin/transactions/:id/flag - Flag suspicious transaction
router.post('/transactions/:id/flag', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    await supabaseAdmin.from('transactions').update({ status: 'HOLD' }).eq('id', req.params.id);

    await auditLog({
      actor_id: req.user!.id, action: 'TRANSACTION_FLAGGED', entity: 'transactions',
      entity_id: req.params.id as string, reason, request_id: req.requestId,
    });

    res.json({ data: { message: 'Transaction flagged' } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to flag transaction' });
  }
});

// ---- SELLER VERIFICATIONS ----
router.get('/verifications', authenticateToken, requireAdminRole, async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.query.role as string | undefined;
    const status = req.query.status as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();

    let query = supabaseAdmin
      .from('kyc_verifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (role && role !== 'all') query = query.eq('user_role', role);
    if (status && status !== 'all') query = query.eq('status', status);
    if (search) query = query.or(`full_name.ilike.%${search}%,id_number.ilike.%${search}%,phone.ilike.%${search}%`);

    const { data, error } = await query;

    if (error) throw error;
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get verifications' });
  }
});

router.post('/verifications/:id/approve', authenticateToken, requireAdminRole, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: verification, error: fetchError } = await supabaseAdmin
      .from('kyc_verifications')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !verification) { res.status(404).json({ error: 'Not found' }); return; }

    await supabaseAdmin.from('kyc_verifications').update({
      status: 'APPROVED',
      reviewed_by: req.user!.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
      notes: req.body?.notes || verification.notes || null,
    }).eq('id', req.params.id);

    if (verification.user_role === 'seller') {
      // Mark seller trust score as verified
      await supabaseAdmin.from('seller_trust_scores').upsert({
        seller_id: verification.user_id,
        verified_at: new Date().toISOString(),
      }, { onConflict: 'seller_id' });
    }

    await auditLog({
      actor_id: req.user!.id,
      action: 'KYC_APPROVED',
      entity: 'kyc_verifications',
      entity_id: req.params.id as string,
    });
    await sendNotification('KYC_STATUS_CHANGED', req.params.id as string, {
      target_user_id: verification.user_id,
      target_phone: verification.phone || '',
      status: 'APPROVED',
    });

    res.json({ data: { status: 'APPROVED', role: verification.user_role } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to approve verification' });
  }
});

router.post('/verifications/:id/reject', authenticateToken, requireAdminRole, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: verification, error: fetchError } = await supabaseAdmin
      .from('kyc_verifications')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (fetchError || !verification) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const reason = req.body.reason || 'Rejected by admin';
    await supabaseAdmin.from('kyc_verifications').update({
      status: 'REJECTED',
      reviewed_by: req.user!.id,
      reviewed_at: new Date().toISOString(),
      notes: reason,
      rejection_reason: reason,
    }).eq('id', req.params.id);

    await auditLog({
      actor_id: req.user!.id,
      action: 'KYC_REJECTED',
      entity: 'kyc_verifications',
      entity_id: req.params.id as string,
    });
    await sendNotification('KYC_STATUS_CHANGED', req.params.id as string, {
      target_user_id: verification.user_id,
      target_phone: verification.phone || '',
      status: 'REJECTED',
      reason,
    });

    res.json({ data: { status: 'REJECTED' } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reject verification' });
  }
});

router.post('/verifications/:id/status', authenticateToken, requireAdminRole, async (req: Request, res: Response): Promise<void> => {
  try {
    const nextStatus = req.body.status as 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';
    if (!nextStatus || !['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REQUIRES_RESUBMISSION'].includes(nextStatus)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const payload: Record<string, unknown> = {
      status: nextStatus,
      reviewed_by: req.user!.id,
      reviewed_at: new Date().toISOString(),
      notes: req.body.notes || null,
      rejection_reason: ['REJECTED', 'REQUIRES_RESUBMISSION'].includes(nextStatus) ? (req.body.reason || null) : null,
    };

    const { data, error } = await supabaseAdmin
      .from('kyc_verifications')
      .update(payload)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error || !data) {
      res.status(404).json({ error: 'Verification not found' });
      return;
    }

    if (nextStatus === 'APPROVED' && data.user_role === 'seller') {
      await supabaseAdmin.from('seller_trust_scores').upsert({
        seller_id: data.user_id,
        verified_at: new Date().toISOString(),
      }, { onConflict: 'seller_id' });
    }

    await auditLog({
      actor_id: req.user!.id,
      action: 'KYC_STATUS_UPDATED',
      entity: 'kyc_verifications',
      entity_id: req.params.id as string,
      after_state: { status: nextStatus, notes: req.body.notes || null },
      reason: req.body.reason || null,
    });
    await sendNotification('KYC_STATUS_CHANGED', req.params.id as string, {
      target_user_id: data.user_id,
      target_phone: data.phone || '',
      status: nextStatus,
      reason: req.body.reason || null,
    });

    res.json({ data });
  } catch {
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

// ---- FRAUD OVERVIEW ----
router.get('/fraud-overview', authenticateToken, requireAdminRole, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: flagged } = await supabaseAdmin
      .from('transactions')
      .select('id, short_id, product_name, grand_total, fraud_score, fraud_flags, is_flagged, buyer_name, seller_name, status, created_at')
      .eq('is_flagged', true)
      .order('fraud_score', { ascending: false });

    const { count: totalFlagged } = await supabaseAdmin
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('is_flagged', true);

    const { count: highRisk } = await supabaseAdmin
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .gte('fraud_score', 75);

    res.json({
      data: {
        transactions: flagged || [],
        total_flagged: totalFlagged || 0,
        high_risk: highRisk || 0,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to get fraud overview' });
  }
});

router.post('/fraud/:id/override-score', authenticateToken, requireAdminRole, async (req: Request, res: Response): Promise<void> => {
  try {
    const score = Number(req.body.score);
    const note = (req.body.note as string | undefined) || '';
    if (Number.isNaN(score) || score < 0 || score > 100) {
      res.status(400).json({ error: 'score must be between 0 and 100' });
      return;
    }
    const { error } = await supabaseAdmin
      .from('transactions')
      .update({ fraud_score: score, is_flagged: score >= 75 })
      .eq('id', req.params.id);
    if (error) throw error;
    await auditLog({
      actor_id: req.user!.id,
      action: 'FRAUD_SCORE_OVERRIDDEN',
      entity: 'transactions',
      entity_id: req.params.id as string,
      reason: note || 'manual override',
      after_state: { fraud_score: score },
      request_id: req.requestId,
    });
    res.json({ data: { id: req.params.id, fraud_score: score, is_flagged: score >= 75 } });
  } catch {
    res.status(500).json({ error: 'Failed to override fraud score' });
  }
});

router.post('/fraud/:id/case-note', authenticateToken, requireAdminRole, async (req: Request, res: Response): Promise<void> => {
  try {
    const note = (req.body.note as string | undefined)?.trim();
    if (!note) {
      res.status(400).json({ error: 'note is required' });
      return;
    }
    await auditLog({
      actor_id: req.user!.id,
      action: 'FRAUD_CASE_NOTE_ADDED',
      entity: 'transactions',
      entity_id: req.params.id as string,
      reason: note,
      request_id: req.requestId,
    });
    res.json({ data: { ok: true } });
  } catch {
    res.status(500).json({ error: 'Failed to add fraud note' });
  }
});

// ---- CSV EXPORT ----
router.get('/export/:type', authenticateToken, requireAdminRole, async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    const { from, to } = req.query;
    let query;

    switch (type) {
      case 'transactions':
        query = supabaseAdmin.from('transactions').select('short_id, product_name, buyer_name, seller_name, product_total, delivery_fee, grand_total, status, created_at, paid_at, completed_at');
        break;
      case 'payouts':
        query = supabaseAdmin.from('payouts').select('id, transaction_id, type, amount, status, provider, created_at, completed_at');
        break;
      case 'disputes':
        query = supabaseAdmin.from('disputes').select('id, transaction_id, reason, status, opened_by, resolved_by, created_at, resolved_at');
        break;
      default:
        res.status(400).json({ error: 'Invalid export type' });
        return;
    }

    if (from) query = query.gte('created_at', from as string);
    if (to) query = query.lte('created_at', to as string);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(10000);
    if (error) throw error;

    res.json({ data });
  } catch {
    res.status(500).json({ error: 'Export failed' });
  }
});

// ---- USERS DIRECTORY ----
router.get('/users', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Math.min(Number(req.query.limit || 25), 100);
    const role = req.query.role as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();
    const from = (page - 1) * limit;

    let query = supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, phone, role, created_at, updated_at', { count: 'exact' })
      .order('updated_at', { ascending: false });

    if (role && role !== 'all') query = query.eq('role', role);
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(from, from + limit - 1);
    if (error) throw error;

    res.json({ data: data || [], total: count || 0, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list users' });
  }
});

router.get('/users/:id', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const [profileRes, txRes, payoutRes, disputeRes, reviewRes, trustRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('user_id', userId).single(),
      supabaseAdmin.from('transactions').select('*').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('payouts').select('*, transactions!inner(id, buyer_id, seller_id, short_id)').or(`transactions.buyer_id.eq.${userId},transactions.seller_id.eq.${userId}`).order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('disputes').select('*').eq('opened_by', userId).order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('reviews').select('*').eq('buyer_id', userId).order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('seller_trust_scores').select('*').eq('seller_id', userId).single(),
    ]);

    if (profileRes.error || !profileRes.data) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const transactions = txRes.data || [];
    const payouts = payoutRes.data || [];
    const disputes = disputeRes.data || [];
    const reviews = reviewRes.data || [];

    const aggregates = {
      total_transactions: transactions.length,
      completed_transactions: transactions.filter((t: any) => t.status === 'COMPLETED').length,
      active_transactions: transactions.filter((t: any) => !['COMPLETED', 'CANCELLED'].includes(t.status)).length,
      total_volume_ghs: transactions.reduce((sum: number, t: any) => sum + Number(t.grand_total || 0), 0),
      disputes_opened: disputes.length,
      payouts_total: payouts.length,
      reviews_total: reviews.length,
    };

    res.json({
      data: {
        profile: profileRes.data,
        aggregates,
        trust_score: trustRes.data || null,
        transactions,
        payouts,
        disputes,
        reviews,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch user profile details' });
  }
});

router.post('/users/:id/role', sensitiveAdminLimiter, authenticateToken, requireSuperadmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const role = req.body.role as 'buyer' | 'seller' | 'admin' | 'superadmin';
    if (!role || !['buyer', 'seller', 'admin', 'superadmin'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const { data: target, error: targetErr } = await supabaseAdmin
      .from('profiles')
      .select('user_id, role')
      .eq('user_id', userId)
      .single();
    if (targetErr || !target) {
      res.status(404).json({ error: 'Target user not found' });
      return;
    }

    if (target.role === 'superadmin' && target.user_id !== req.user!.id) {
      res.status(403).json({ error: 'Cannot modify another superadmin role' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('user_id', userId);
    if (error) throw error;

    await auditLog({
      actor_id: req.user!.id,
      action: 'USER_ROLE_UPDATED',
      entity: 'profiles',
      entity_id: userId,
      before_state: { role: target.role },
      after_state: { role },
      request_id: req.requestId,
    });

    res.json({ data: { ok: true, role } });
  } catch {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// ---- IMPERSONATION ----
router.post('/impersonation/start', sensitiveAdminLimiter, authenticateToken, requireSuperadmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const targetUserId = req.body.target_user_id as string;
    const reason = (req.body.reason as string | undefined)?.trim();
    const expiresMinutes = Math.min(Number(req.body.expires_minutes || 30), 240);

    if (!targetUserId || !reason) {
      res.status(400).json({ error: 'target_user_id and reason are required' });
      return;
    }

    if (targetUserId === req.user!.id) {
      res.status(400).json({ error: 'Cannot impersonate yourself' });
      return;
    }

    const { data: targetProfile, error: targetErr } = await supabaseAdmin
      .from('profiles')
      .select('user_id, role, full_name, phone')
      .eq('user_id', targetUserId)
      .single();

    if (targetErr || !targetProfile) {
      res.status(404).json({ error: 'Target user not found' });
      return;
    }

    if (targetProfile.role === 'superadmin') {
      res.status(403).json({ error: 'Cannot impersonate another superadmin' });
      return;
    }

    await supabaseAdmin
      .from('impersonation_sessions')
      .update({
        status: 'ENDED',
        ended_at: new Date().toISOString(),
        ended_reason: 'superseded',
        ended_by: req.user!.id,
      })
      .eq('impersonator_id', req.user!.id)
      .eq('status', 'ACTIVE');

    const sessionToken = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('impersonation_sessions')
      .insert({
        session_token: sessionToken,
        impersonator_id: req.user!.id,
        target_user_id: targetUserId,
        reason,
        status: 'ACTIVE',
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
        request_id: req.requestId,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      })
      .select('id, session_token, target_user_id, started_at, expires_at, reason')
      .single();

    if (error) throw error;

    await auditLog({
      actor_id: req.user!.id,
      action: 'IMPERSONATION_STARTED',
      entity: 'impersonation_sessions',
      entity_id: data.id as string,
      reason,
      after_state: { target_user_id: targetUserId, expires_at: expiresAt },
      request_id: req.requestId,
    });
    await sendNotification('ADMIN_IMPERSONATION_STARTED', data.id, {
      actor_id: req.user!.id,
      actor_phone: '',
      message: `Impersonation started for user ${targetUserId}: ${reason}`,
    });

    res.json({
      data: {
        ...data,
        target_profile: {
          user_id: targetProfile.user_id,
          full_name: targetProfile.full_name,
          phone: targetProfile.phone,
          role: targetProfile.role,
        },
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to start impersonation' });
  }
});

router.get('/impersonation/current', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const tokenHeader = req.headers['x-impersonation-token'];
    const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;
    if (!token) {
      res.json({ data: null });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('impersonation_sessions')
      .select('id, impersonator_id, target_user_id, reason, status, started_at, expires_at, ended_at')
      .eq('session_token', token)
      .single();
    if (error || !data) {
      res.json({ data: null });
      return;
    }

    if (data.status !== 'ACTIVE' || new Date(data.expires_at).getTime() < Date.now()) {
      res.json({ data: null });
      return;
    }

    const [targetProfileRes, impersonatorProfileRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('user_id, full_name, phone, role').eq('user_id', data.target_user_id).single(),
      supabaseAdmin.from('profiles').select('user_id, full_name, phone, role').eq('user_id', data.impersonator_id).single(),
    ]);

    res.json({
      data: {
        ...data,
        target_profile: targetProfileRes.data || null,
        impersonator_profile: impersonatorProfileRes.data || null,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to get current impersonation' });
  }
});

router.post('/impersonation/stop', sensitiveAdminLimiter, authenticateToken, requireSuperadmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const tokenHeader = req.headers['x-impersonation-token'];
    const tokenFromHeader = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;
    const token = (req.body.session_token as string | undefined) || tokenFromHeader;
    if (!token) {
      res.status(400).json({ error: 'session_token is required' });
      return;
    }

    const { data: existing } = await supabaseAdmin
      .from('impersonation_sessions')
      .select('id, status')
      .eq('session_token', token)
      .eq('impersonator_id', req.user!.id)
      .single();
    if (!existing) {
      res.status(404).json({ error: 'Impersonation session not found' });
      return;
    }

    await supabaseAdmin
      .from('impersonation_sessions')
      .update({
        status: 'ENDED',
        ended_at: new Date().toISOString(),
        ended_reason: req.body.reason || 'manual-stop',
        ended_by: req.user!.id,
      })
      .eq('id', existing.id);

    await auditLog({
      actor_id: req.user!.id,
      action: 'IMPERSONATION_STOPPED',
      entity: 'impersonation_sessions',
      entity_id: existing.id as string,
      reason: req.body.reason || 'manual-stop',
      request_id: req.requestId,
    });
    await sendNotification('ADMIN_IMPERSONATION_STOPPED', existing.id, {
      actor_id: req.user!.id,
      actor_phone: '',
      message: `Impersonation stopped: ${req.body.reason || 'manual-stop'}`,
    });

    res.json({ data: { ok: true } });
  } catch {
    res.status(500).json({ error: 'Failed to stop impersonation' });
  }
});

router.get('/sessions', ...adminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [impersonations, adminSessions] = await Promise.all([
      supabaseAdmin
        .from('impersonation_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(200),
      supabaseAdmin
        .from('admin_sessions')
        .select('*')
        .order('last_seen_at', { ascending: false })
        .limit(200),
    ]);
    res.json({
      data: {
        impersonations: impersonations.data || [],
        admin_sessions: adminSessions.data || [],
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch session monitor data' });
  }
});

// ---- SAVED VIEWS ----
router.get('/saved-views', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const viewType = req.query.view_type as string | undefined;
    let query = supabaseAdmin
      .from('admin_saved_views')
      .select('*')
      .eq('owner_id', req.user!.id)
      .order('updated_at', { ascending: false });
    if (viewType) query = query.eq('view_type', viewType);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch {
    res.status(500).json({ error: 'Failed to fetch saved views' });
  }
});

router.post('/saved-views', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body || {};
    const { data, error } = await supabaseAdmin
      .from('admin_saved_views')
      .insert({
        owner_id: req.user!.id,
        view_type: payload.view_type || 'transactions',
        name: payload.name || 'Untitled view',
        is_default: !!payload.is_default,
        filters: payload.filters || {},
        sort: payload.sort || {},
        columns: payload.columns || [],
      })
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch {
    res.status(500).json({ error: 'Failed to create saved view' });
  }
});

router.put('/saved-views/:id', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const updates = req.body || {};
    const { data, error } = await supabaseAdmin
      .from('admin_saved_views')
      .update({
        name: updates.name,
        is_default: updates.is_default,
        filters: updates.filters,
        sort: updates.sort,
        columns: updates.columns,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('owner_id', req.user!.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json({ data });
  } catch {
    res.status(500).json({ error: 'Failed to update saved view' });
  }
});

router.delete('/saved-views/:id', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await supabaseAdmin
      .from('admin_saved_views')
      .delete()
      .eq('id', req.params.id)
      .eq('owner_id', req.user!.id);
    res.json({ data: { ok: true } });
  } catch {
    res.status(500).json({ error: 'Failed to delete saved view' });
  }
});

// ---- BULK ACTIONS ----
router.post('/bulk/transactions', sensitiveAdminLimiter, ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const ids = (req.body.ids as string[]) || [];
    const action = req.body.action as 'hold' | 'release';
    if (!ids.length || !action) {
      res.status(400).json({ error: 'ids and action are required' });
      return;
    }
    const status = action === 'hold' ? 'HOLD' : 'PAID';
    const { error } = await supabaseAdmin
      .from('transactions')
      .update({ status })
      .in('id', ids);
    if (error) throw error;
    await auditLog({
      actor_id: req.user!.id,
      action: 'BULK_TRANSACTION_ACTION',
      entity: 'transactions',
      after_state: { ids, action, status },
      request_id: req.requestId,
    });
    res.json({ data: { updated: ids.length } });
  } catch {
    res.status(500).json({ error: 'Bulk transaction action failed' });
  }
});

router.post('/bulk/payouts', sensitiveAdminLimiter, ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const ids = (req.body.ids as string[]) || [];
    const action = req.body.action as 'hold' | 'release' | 'retry';
    if (!ids.length || !action) {
      res.status(400).json({ error: 'ids and action are required' });
      return;
    }
    let status: string = 'PENDING';
    if (action === 'hold') status = 'HELD';
    if (action === 'release' || action === 'retry') status = 'QUEUED';

    const updateData: Record<string, any> = { status };
    if (action === 'hold') updateData.held_reason = req.body.reason || 'Bulk held';
    else updateData.held_reason = null;
    if (action === 'retry') { updateData.attempts = 0; updateData.last_error = null; }

    const { error } = await supabaseAdmin
      .from('payouts')
      .update(updateData)
      .in('id', ids);
    if (error) throw error;

    if (action === 'release' || action === 'retry') {
      const { data: payouts } = await supabaseAdmin
        .from('payouts')
        .select('id, transaction_id, type, amount, destination, idempotency_key')
        .in('id', ids);

      const isVercelRuntime = !!process.env.VERCEL;
      for (const p of payouts || []) {
        const jobData = {
          payout_id: p.id,
          transaction_id: p.transaction_id,
          type: p.type,
          amount: p.amount,
          destination: p.destination,
          idempotency_key: p.idempotency_key,
          reason: `Bulk ${action}`,
        };
        if (isVercelRuntime) {
          await processPayoutInline(jobData);
        } else {
          await payoutQueue.add(`${p.type.toLowerCase()}_payout`, jobData);
        }
      }
    }

    await auditLog({
      actor_id: req.user!.id,
      action: 'BULK_PAYOUT_ACTION',
      entity: 'payouts',
      after_state: { ids, action, status },
      request_id: req.requestId,
    });
    res.json({ data: { updated: ids.length } });
  } catch {
    res.status(500).json({ error: 'Bulk payout action failed' });
  }
});

router.post('/bulk/disputes', sensitiveAdminLimiter, ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const ids = (req.body.ids as string[]) || [];
    const action = req.body.action as 'under_review' | 'resolve' | 'reject';
    if (!ids.length || !action) {
      res.status(400).json({ error: 'ids and action are required' });
      return;
    }
    const statusMap: Record<string, string> = {
      under_review: 'UNDER_REVIEW',
      resolve: 'RESOLVED',
      reject: 'REJECTED',
    };
    const status = statusMap[action];
    const payload: Record<string, unknown> = { status };
    if (status === 'RESOLVED' || status === 'REJECTED') {
      payload.resolved_by = req.user!.id;
      payload.resolved_at = new Date().toISOString();
    }
    const { error } = await supabaseAdmin
      .from('disputes')
      .update(payload)
      .in('id', ids);
    if (error) throw error;
    await auditLog({
      actor_id: req.user!.id,
      action: 'BULK_DISPUTE_ACTION',
      entity: 'disputes',
      after_state: { ids, action, status },
      request_id: req.requestId,
    });
    res.json({ data: { updated: ids.length } });
  } catch {
    res.status(500).json({ error: 'Bulk dispute action failed' });
  }
});

// ---- ALERT RULES / EVENTS ----
router.get('/alert-rules', ...adminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_alert_rules')
      .select('*')
      .order('key', { ascending: true });
    if (error) throw error;
    res.json({ data: data || [] });
  } catch {
    res.status(500).json({ error: 'Failed to fetch alert rules' });
  }
});

router.put('/alert-rules/:key', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const key = req.params.key;
    const updates = req.body || {};
    const { data, error } = await supabaseAdmin
      .from('admin_alert_rules')
      .update({
        enabled: updates.enabled,
        threshold: updates.threshold,
        window_minutes: updates.window_minutes,
        severity: updates.severity,
        channels: updates.channels,
        updated_by: req.user!.id,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key)
      .select('*')
      .single();
    if (error) throw error;
    res.json({ data });
  } catch {
    res.status(500).json({ error: 'Failed to update alert rule' });
  }
});

router.get('/alerts/events', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    let query = supabaseAdmin.from('admin_alert_events').select('*').order('created_at', { ascending: false }).limit(200);
    if (status && status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch {
    res.status(500).json({ error: 'Failed to fetch alert events' });
  }
});

router.post('/alerts/events/:id/ack', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_alert_events')
      .update({
        status: 'ACKNOWLEDGED',
        acknowledged_by: req.user!.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json({ data });
  } catch {
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// ---- EXPORT JOBS (ASYNC-STUB) ----
router.get('/export/jobs', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Math.min(Number(req.query.limit || 30), 100);
    const from = (page - 1) * limit;
    const { data, error, count } = await supabaseAdmin
      .from('admin_export_jobs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);
    if (error) throw error;
    res.json({ data: data || [], total: count || 0, page, limit });
  } catch {
    res.status(500).json({ error: 'Failed to list export jobs' });
  }
});

router.post('/export/jobs', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const exportType = req.body.export_type as string;
    const filters = req.body.filters || {};
    if (!exportType) {
      res.status(400).json({ error: 'export_type is required' });
      return;
    }

    const startedAt = new Date().toISOString();
    let csvContent = '';
    let rowCount = 0;

    const toCsvRow = (values: any[]) =>
      values.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',') + '\n';

    switch (exportType) {
      case 'transactions': {
        const { data: rows } = await supabaseAdmin
          .from('transactions')
          .select('short_id, status, buyer_name, seller_name, product_total, delivery_fee, grand_total, created_at, completed_at')
          .order('created_at', { ascending: false })
          .limit(10000);
        const headers = ['Short ID', 'Status', 'Buyer', 'Seller', 'Product Total', 'Delivery Fee', 'Grand Total', 'Created', 'Completed'];
        csvContent = toCsvRow(headers);
        for (const r of rows || []) {
          csvContent += toCsvRow([r.short_id, r.status, r.buyer_name, r.seller_name, r.product_total, r.delivery_fee, r.grand_total, r.created_at, r.completed_at]);
          rowCount++;
        }
        break;
      }
      case 'payouts': {
        const { data: rows } = await supabaseAdmin
          .from('payouts')
          .select('id, transaction_id, type, amount, status, provider_ref, created_at, completed_at')
          .order('created_at', { ascending: false })
          .limit(10000);
        const headers = ['ID', 'Transaction ID', 'Type', 'Amount', 'Status', 'Provider Ref', 'Created', 'Completed'];
        csvContent = toCsvRow(headers);
        for (const r of rows || []) {
          csvContent += toCsvRow([r.id, r.transaction_id, r.type, r.amount, r.status, r.provider_ref, r.created_at, r.completed_at]);
          rowCount++;
        }
        break;
      }
      case 'disputes': {
        const { data: rows } = await supabaseAdmin
          .from('disputes')
          .select('id, transaction_id, status, reason, resolution, resolution_action, created_at, resolved_at')
          .order('created_at', { ascending: false })
          .limit(10000);
        const headers = ['ID', 'Transaction ID', 'Status', 'Reason', 'Resolution', 'Action', 'Created', 'Resolved'];
        csvContent = toCsvRow(headers);
        for (const r of rows || []) {
          csvContent += toCsvRow([r.id, r.transaction_id, r.status, r.reason, r.resolution, r.resolution_action, r.created_at, r.resolved_at]);
          rowCount++;
        }
        break;
      }
      case 'users': {
        const { data: rows } = await supabaseAdmin
          .from('profiles')
          .select('user_id, display_name, phone, role, kyc_status, created_at')
          .order('created_at', { ascending: false })
          .limit(10000);
        const headers = ['User ID', 'Name', 'Phone', 'Role', 'KYC Status', 'Created'];
        csvContent = toCsvRow(headers);
        for (const r of rows || []) {
          csvContent += toCsvRow([r.user_id, r.display_name, r.phone, r.role, r.kyc_status, r.created_at]);
          rowCount++;
        }
        break;
      }
      default: {
        res.status(400).json({ error: `Unsupported export type: ${exportType}` });
        return;
      }
    }

    const csvBase64 = Buffer.from(csvContent, 'utf-8').toString('base64');
    const completedAt = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('admin_export_jobs')
      .insert({
        requested_by: req.user!.id,
        export_type: exportType,
        status: 'COMPLETED',
        request_filters: filters,
        file_path: csvBase64,
        file_format: 'csv',
        started_at: startedAt,
        completed_at: completedAt,
        row_count: rowCount,
      })
      .select('*')
      .single();
    if (error) throw error;

    await auditLog({
      actor_id: req.user!.id,
      action: 'EXPORT_JOB_CREATED',
      entity: 'admin_export_jobs',
      entity_id: data.id as string,
      after_state: { export_type: exportType, filters, row_count: rowCount },
      request_id: req.requestId,
    });

    res.status(201).json({ data });
  } catch {
    res.status(500).json({ error: 'Failed to create export job' });
  }
});

router.get('/export/jobs/:id/download', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: job } = await supabaseAdmin
      .from('admin_export_jobs')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (!job) { res.status(404).json({ error: 'Export job not found' }); return; }
    if (job.status !== 'COMPLETED' || !job.file_path) {
      res.status(400).json({ error: 'Export not ready' }); return;
    }

    const csvContent = Buffer.from(job.file_path, 'base64').toString('utf-8');
    const filename = `${job.export_type}-${job.id}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch {
    res.status(500).json({ error: 'Failed to download export' });
  }
});

// ---- ANALYTICS OVERVIEW ----
router.get('/analytics/overview', ...adminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [txRes, payoutRes, disputeRes, openAlertsRes] = await Promise.all([
      supabaseAdmin.from('transactions').select('grand_total, status, fraud_score, created_at, completed_at'),
      supabaseAdmin.from('payouts').select('amount, status, created_at'),
      supabaseAdmin.from('disputes').select('status, created_at, resolved_at'),
      supabaseAdmin.from('admin_alert_events').select('id', { count: 'exact', head: true }).eq('status', 'OPEN'),
    ]);

    const transactions = txRes.data || [];
    const payouts = payoutRes.data || [];
    const disputes = disputeRes.data || [];

    const gmv = transactions.reduce((sum: number, t: any) => sum + Number(t.grand_total || 0), 0);
    const escrowHeld = transactions
      .filter((t: any) => !['COMPLETED', 'CANCELLED'].includes(t.status))
      .reduce((sum: number, t: any) => sum + Number(t.grand_total || 0), 0);
    const disputeRate = transactions.length > 0 ? (disputes.length / transactions.length) * 100 : 0;
    const payoutFailures = payouts.filter((p: any) => p.status === 'FAILED').length;
    const payoutFailureRate = payouts.length > 0 ? (payoutFailures / payouts.length) * 100 : 0;

    const resolvedDisputes = disputes.filter((d: any) => d.status === 'RESOLVED' && d.resolved_at && d.created_at);
    const avgResolutionHours = resolvedDisputes.length > 0
      ? resolvedDisputes.reduce((sum: number, d: any) => {
          const created = new Date(d.created_at).getTime();
          const resolved = new Date(d.resolved_at).getTime();
          return sum + Math.max(0, (resolved - created) / (1000 * 60 * 60));
        }, 0) / resolvedDisputes.length
      : 0;

    res.json({
      data: {
        gmv,
        escrow_held_value: escrowHeld,
        dispute_rate_percent: Number(disputeRate.toFixed(2)),
        payout_failure_rate_percent: Number(payoutFailureRate.toFixed(2)),
        avg_dispute_resolution_hours: Number(avgResolutionHours.toFixed(2)),
        open_alerts: openAlertsRes.count || 0,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to compute analytics overview' });
  }
});

// ---- OPS RELIABILITY ----
router.get('/ops/reliability', ...adminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    const [redis, queueHealth, dl1h, dl24h, latestDeadLetters, sms1h, sms24h] = await Promise.all([
      pingRedis(),
      getQueueHealth(),
      supabaseAdmin.from('ops_dead_letters').select('id', { count: 'exact', head: true }).gte('created_at', oneHourAgo),
      supabaseAdmin.from('ops_dead_letters').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo),
      supabaseAdmin.from('ops_dead_letters').select('*').order('created_at', { ascending: false }).limit(25),
      supabaseAdmin.from('notifications').select('status, channel').eq('channel', 'SMS').gte('created_at', oneHourAgo),
      supabaseAdmin.from('notifications').select('status, channel').eq('channel', 'SMS').gte('created_at', dayAgo),
    ]);

    const smsRows1h = sms1h.data || [];
    const smsRows24h = sms24h.data || [];
    const smsFailed1h = smsRows1h.filter((row: any) => row.status === 'FAILED').length;
    const smsFailed24h = smsRows24h.filter((row: any) => row.status === 'FAILED').length;
    const smsFailureRate1h = smsRows1h.length > 0 ? (smsFailed1h / smsRows1h.length) * 100 : 0;
    const smsFailureRate24h = smsRows24h.length > 0 ? (smsFailed24h / smsRows24h.length) * 100 : 0;

    res.json({
      data: {
        redis,
        queue_health: queueHealth,
        dead_letters: {
          count_1h: dl1h.count || 0,
          count_24h: dl24h.count || 0,
          latest: latestDeadLetters.data || [],
        },
        sms: {
          sent_1h: smsRows1h.length - smsFailed1h,
          failed_1h: smsFailed1h,
          failure_rate_1h_pct: Number(smsFailureRate1h.toFixed(2)),
          sent_24h: smsRows24h.length - smsFailed24h,
          failed_24h: smsFailed24h,
          failure_rate_24h_pct: Number(smsFailureRate24h.toFixed(2)),
        },
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to load reliability overview' });
  }
});

router.get('/ops/logs', ...adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const level = req.query.level as string | undefined;
    const tag = req.query.tag as string | undefined;
    const limit = Math.min(Number(req.query.limit || 100), 300);
    let query = supabaseAdmin.from('ops_runtime_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (level && ['info', 'warn', 'error'].includes(level)) query = query.eq('level', level);
    if (tag) query = query.ilike('tag', `%${tag}%`);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch {
    res.status(500).json({ error: 'Failed to load ops logs' });
  }
});

export default router;

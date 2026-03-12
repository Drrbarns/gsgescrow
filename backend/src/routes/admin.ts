import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { supabaseAdmin, auditLog } from '../services/supabase';

const router = Router();
const adminAuth = [authenticateToken, requireRole('admin')];

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
router.get('/verifications', authenticateToken, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('seller_verifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get verifications' });
  }
});

router.post('/verifications/:id/approve', authenticateToken, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: verification, error: fetchError } = await supabaseAdmin
      .from('seller_verifications')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !verification) { res.status(404).json({ error: 'Not found' }); return; }

    await supabaseAdmin.from('seller_verifications').update({
      status: 'APPROVED',
      reviewed_by: req.user!.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', req.params.id);

    // Mark seller trust score as verified
    await supabaseAdmin.from('seller_trust_scores').upsert({
      seller_id: verification.seller_id,
      verified_at: new Date().toISOString(),
    }, { onConflict: 'seller_id' });

    await auditLog({
      user_id: req.user!.id,
      action: 'VERIFY_SELLER_APPROVED',
      entity: 'seller_verifications',
      entity_id: req.params.id,
    });

    res.json({ data: { status: 'APPROVED' } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to approve verification' });
  }
});

router.post('/verifications/:id/reject', authenticateToken, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    await supabaseAdmin.from('seller_verifications').update({
      status: 'REJECTED',
      reviewed_by: req.user!.id,
      reviewed_at: new Date().toISOString(),
      notes: req.body.reason || 'Rejected by admin',
    }).eq('id', req.params.id);

    await auditLog({
      user_id: req.user!.id,
      action: 'VERIFY_SELLER_REJECTED',
      entity: 'seller_verifications',
      entity_id: req.params.id,
    });

    res.json({ data: { status: 'REJECTED' } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reject verification' });
  }
});

// ---- FRAUD OVERVIEW ----
router.get('/fraud-overview', authenticateToken, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
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

// ---- CSV EXPORT ----
router.get('/export/:type', authenticateToken, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
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

export default router;

import { Router, Request, Response } from 'express';
import { authenticateToken, isPrivilegedRole, requireAdminRole } from '../middleware/auth';
import { supabaseAdmin, auditLog } from '../services/supabase';
import { notificationQueue } from '../services/queue';

const router = Router();

// POST /api/disputes - Open a dispute
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { transaction_id, reason } = req.body;
    if (!reason) { res.status(400).json({ error: 'Reason is required' }); return; }

    const { data: txn } = await supabaseAdmin
      .from('transactions').select('*').eq('id', transaction_id).single();
    if (!txn) { res.status(404).json({ error: 'Transaction not found' }); return; }

    if (txn.buyer_id !== req.user!.id && txn.seller_id !== req.user!.id && !isPrivilegedRole(req.user!.role)) {
      res.status(403).json({ error: 'Access denied' }); return;
    }

    const { data: dispute, error } = await supabaseAdmin
      .from('disputes')
      .insert({
        transaction_id,
        opened_by: req.user!.id,
        reason,
        status: 'OPEN',
      })
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('transactions').update({ status: 'DISPUTE' }).eq('id', transaction_id);

    await auditLog({
      actor_id: req.user!.id, action: 'DISPUTE_OPENED', entity: 'disputes', entity_id: dispute.id,
      after_state: { reason }, request_id: req.requestId,
    });

    await notificationQueue.add('send', {
      type: 'DISPUTE_OPENED', transaction_id,
    });

    res.status(201).json({ data: dispute });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to open dispute' });
  }
});

// GET /api/disputes - List disputes
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const page = (req.query.page as string) || '1';
    const limit = (req.query.limit as string) || '20';
    let query = supabaseAdmin.from('disputes')
      .select('*, transactions(short_id, buyer_name, seller_name, product_name)', { count: 'exact' });

    if (!isPrivilegedRole(req.user!.role)) {
      query = query.eq('opened_by', req.user!.id);
    }
    if (status) query = query.eq('status', status as string);

    const pageNum = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const from = (pageNum - 1) * pageSize;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    res.json({ data, total: count, page: pageNum, limit: pageSize });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list disputes' });
  }
});

// GET /api/disputes/:id
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: dispute, error } = await supabaseAdmin
      .from('disputes')
      .select('*, dispute_evidence(*), transactions(*)')
      .eq('id', req.params.id)
      .single();

    if (error || !dispute) { res.status(404).json({ error: 'Dispute not found' }); return; }
    if (dispute.opened_by !== req.user!.id && !isPrivilegedRole(req.user!.role)) {
      res.status(403).json({ error: 'Access denied' }); return;
    }

    res.json({ data: dispute });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get dispute' });
  }
});

// POST /api/disputes/:id/evidence - Upload evidence metadata
router.post('/:id/evidence', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { storage_path, file_name, mime_type, file_size, metadata } = req.body;

    const { data, error } = await supabaseAdmin
      .from('dispute_evidence')
      .insert({
        dispute_id: req.params.id,
        uploaded_by: req.user!.id,
        storage_path,
        file_name,
        mime_type,
        file_size,
        metadata,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save evidence' });
  }
});

// POST /api/disputes/:id/resolve - Admin resolve dispute
router.post('/:id/resolve', authenticateToken, requireAdminRole, async (req: Request, res: Response): Promise<void> => {
  try {
    const { resolution, resolution_action, notes } = req.body;
    if (!resolution) { res.status(400).json({ error: 'Resolution is required' }); return; }

    const { data: dispute } = await supabaseAdmin
      .from('disputes').select('*').eq('id', req.params.id).single();
    if (!dispute) { res.status(404).json({ error: 'Dispute not found' }); return; }

    await supabaseAdmin.from('disputes').update({
      status: 'RESOLVED',
      resolution,
      resolution_action,
      notes,
      resolved_by: req.user!.id,
      resolved_at: new Date().toISOString(),
    }).eq('id', dispute.id);

    // Handle resolution action on the transaction
    if (resolution_action === 'release') {
      await supabaseAdmin.from('transactions')
        .update({ status: 'DELIVERED_CONFIRMED' })
        .eq('id', dispute.transaction_id);
    } else if (resolution_action === 'refund') {
      await supabaseAdmin.from('transactions')
        .update({ status: 'CANCELLED' })
        .eq('id', dispute.transaction_id);
    } else if (resolution_action === 'hold') {
      await supabaseAdmin.from('transactions')
        .update({ status: 'HOLD' })
        .eq('id', dispute.transaction_id);
    }

    await auditLog({
      actor_id: req.user!.id, action: 'DISPUTE_RESOLVED', entity: 'disputes', entity_id: dispute.id,
      after_state: { resolution, resolution_action },
      request_id: req.requestId,
    });

    res.json({ data: { message: 'Dispute resolved' } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

export default router;

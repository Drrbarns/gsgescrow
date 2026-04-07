import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdminRole, optionalAuth, isPrivilegedRole } from '../middleware/auth';
import { supabaseAdmin } from '../services/supabase';

const router = Router();

// POST /api/reviews
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { transaction_id, seller_rating, delivery_rating, comment } = req.body;

    const { data: txn } = await supabaseAdmin
      .from('transactions').select('buyer_id, status').eq('id', transaction_id).single();
    if (!txn) { res.status(404).json({ error: 'Transaction not found' }); return; }
    if (txn.buyer_id !== req.user!.id) { res.status(403).json({ error: 'Only buyer can review' }); return; }
    if (!['DELIVERED_CONFIRMED', 'COMPLETED'].includes(txn.status)) {
      res.status(400).json({ error: 'Cannot review before delivery' }); return;
    }

    const { data: existing } = await supabaseAdmin
      .from('reviews').select('id').eq('transaction_id', transaction_id).eq('buyer_id', req.user!.id).limit(1);
    if (existing && existing.length > 0) {
      res.status(409).json({ error: 'Already reviewed' }); return;
    }

    const { data: review, error } = await supabaseAdmin
      .from('reviews')
      .insert({
        transaction_id,
        buyer_id: req.user!.id,
        seller_rating,
        delivery_rating,
        comment,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data: review });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// GET /api/reviews - Public approved reviews
router.get('/', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = (req.query.page as string) || '1';
    const limit = (req.query.limit as string) || '20';
    const isAdmin = isPrivilegedRole(req.user?.role);

    let query = supabaseAdmin.from('reviews')
      .select('*, transactions(short_id, product_name, seller_name)', { count: 'exact' });

    if (!isAdmin) query = query.eq('status', 'APPROVED');

    const pageNum = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const from = (pageNum - 1) * pageSize;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    res.json({ data, total: count, page: pageNum, limit: pageSize });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list reviews' });
  }
});

// POST /api/reviews/:id/moderate - Admin moderate
router.post('/:id/moderate', authenticateToken, requireAdminRole, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ error: 'Status must be APPROVED or REJECTED' }); return;
    }

    await supabaseAdmin.from('reviews').update({
      status,
      moderated_by: req.user!.id,
      moderated_at: new Date().toISOString(),
    }).eq('id', req.params.id);

    res.json({ data: { message: `Review ${status.toLowerCase()}` } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to moderate review' });
  }
});

export default router;

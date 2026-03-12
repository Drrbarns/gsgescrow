import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// POST /api/auth/profile - Create or update profile after OTP login
router.post('/profile', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { full_name, ghana_card_name, role } = req.body;

    const { data: existing } = await supabaseAdmin
      .from('profiles').select('*').eq('user_id', userId).single();

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (full_name) updates.full_name = full_name;
      if (ghana_card_name) updates.ghana_card_name = ghana_card_name;

      if (Object.keys(updates).length > 0) {
        const { data, error } = await supabaseAdmin
          .from('profiles').update(updates).eq('user_id', userId).select().single();
        if (error) throw error;
        res.json({ data });
      } else {
        res.json({ data: existing });
      }
    } else {
      const phone = req.user!.phone;
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: userId,
          phone,
          full_name: full_name || '',
          ghana_card_name,
          role: role === 'seller' ? 'seller' : 'buyer',
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ data });
    }
  } catch (err: any) {
    console.error('[PROFILE]', err.message);
    res.status(500).json({ error: 'Failed to manage profile' });
  }
});

// GET /api/auth/me - Get current profile
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles').select('*').eq('user_id', req.user!.id).single();
    if (error) throw error;
    res.json({ data: { ...data, auth_role: req.user!.role } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// GET /api/auth/banks - List banks for payout
router.get('/banks', authenticateToken, async (_req: Request, res: Response): Promise<void> => {
  try {
    const { listBanks } = await import('../services/paystack');
    const result = await listBanks('GHS');
    res.json({ data: result.data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list banks' });
  }
});

// ---- NOTIFICATIONS ----
router.get('/notifications', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/notifications/read-all', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('user_id', req.user!.id)
      .eq('read', false);

    res.json({ data: { ok: true } });
  } catch {
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

export default router;

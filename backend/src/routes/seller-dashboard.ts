import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabaseAdmin } from '../services/supabase';
import { getSellerAnalytics, getSellerTrustScore, recalculateTrustScore } from '../services/trust';
import { getReceipts } from '../services/receipts';

const router = Router();

router.get('/analytics', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user!.id;
    const [analytics, trustScore] = await Promise.all([
      getSellerAnalytics(sellerId),
      getSellerTrustScore(sellerId),
    ]);

    res.json({ data: { ...analytics, trust_score: trustScore } });
  } catch (err: any) {
    console.error('[SELLER_ANALYTICS]', err.message);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

router.get('/trust-score', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = (req.query.seller_id as string) || req.user!.id;
    let score = await getSellerTrustScore(sellerId);

    if (!score) {
      await recalculateTrustScore(sellerId);
      score = await getSellerTrustScore(sellerId);
    }

    res.json({ data: score });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get trust score' });
  }
});

router.get('/receipts/:transaction_id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const receipts = await getReceipts(req.params.transaction_id);
    res.json({ data: receipts });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get receipts' });
  }
});

router.post('/verify', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { business_name, business_type, ghana_card_number, tin_number, business_location, social_links } = req.body;

    const { data: existing } = await supabaseAdmin
      .from('seller_verifications')
      .select('id, status')
      .eq('seller_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing?.[0]?.status === 'PENDING') {
      res.status(409).json({ error: 'Verification already pending' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('seller_verifications')
      .insert({
        seller_id: req.user!.id,
        business_name,
        business_type,
        ghana_card_number,
        tin_number,
        business_location,
        social_links,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit verification' });
  }
});

router.get('/verification-status', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data } = await supabaseAdmin
      .from('seller_verifications')
      .select('*')
      .eq('seller_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(1);

    res.json({ data: data?.[0] || null });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to check verification' });
  }
});

export default router;

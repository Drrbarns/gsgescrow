import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabaseAdmin } from '../services/supabase';
import { getSellerAnalytics, getSellerTrustScore, recalculateTrustScore } from '../services/trust';
import { getReceipts } from '../services/receipts';

const router = Router();

async function getCurrentUserRole(userId: string): Promise<'buyer' | 'seller'> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single();
  return data?.role === 'seller' ? 'seller' : 'buyer';
}

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
    const receipts = await getReceipts(req.params.transaction_id as string);
    res.json({ data: receipts });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get receipts' });
  }
});

router.post('/verify', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { business_name, business_type, ghana_card_number, tin_number, business_location, social_links } = req.body;
    const userId = req.user!.id;
    const userRole = await getCurrentUserRole(userId);

    const { data: existing } = await supabaseAdmin
      .from('kyc_verifications')
      .select('id, status')
      .eq('user_id', userId)
      .eq('user_role', userRole)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing?.[0]?.status === 'PENDING' || existing?.[0]?.status === 'UNDER_REVIEW') {
      res.status(409).json({ error: 'Verification already pending' });
      return;
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone')
      .eq('user_id', userId)
      .single();

    const { data, error } = await supabaseAdmin
      .from('kyc_verifications')
      .insert({
        user_id: userId,
        user_role: userRole,
        full_name: profile?.full_name || business_name || 'KYC Applicant',
        id_type: 'ghana_card',
        id_number: ghana_card_number,
        business_name,
        business_type,
        tax_number: tin_number,
        phone: profile?.phone || null,
        address: business_location || null,
        metadata: social_links || null,
        status: 'PENDING',
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
    const userId = req.user!.id;
    const userRole = await getCurrentUserRole(userId);
    const { data } = await supabaseAdmin
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', userId)
      .eq('user_role', userRole)
      .order('created_at', { ascending: false })
      .limit(1);

    res.json({ data: data?.[0] || null });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to check verification' });
  }
});

router.post('/kyc', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userRole = await getCurrentUserRole(userId);
    const payload = req.body || {};

    const { data: existing } = await supabaseAdmin
      .from('kyc_verifications')
      .select('id, status')
      .eq('user_id', userId)
      .eq('user_role', userRole)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing?.[0]?.status === 'PENDING' || existing?.[0]?.status === 'UNDER_REVIEW') {
      res.status(409).json({ error: 'KYC request already pending review' });
      return;
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone')
      .eq('user_id', userId)
      .single();

    const { data, error } = await supabaseAdmin
      .from('kyc_verifications')
      .insert({
        user_id: userId,
        user_role: userRole,
        full_name: payload.full_name || profile?.full_name || 'KYC Applicant',
        id_type: payload.id_type || 'ghana_card',
        id_number: payload.id_number || payload.ghana_card_number || null,
        business_name: payload.business_name || null,
        business_type: payload.business_type || null,
        tax_number: payload.tax_number || payload.tin_number || null,
        phone: payload.phone || profile?.phone || null,
        address: payload.address || payload.business_location || null,
        country: payload.country || 'Ghana',
        notes: payload.notes || null,
        document_front_url: payload.document_front_url || null,
        document_back_url: payload.document_back_url || null,
        selfie_url: payload.selfie_url || null,
        metadata: payload.metadata || payload.social_links || null,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit KYC' });
  }
});

router.get('/kyc-status', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userRole = await getCurrentUserRole(userId);
    const { data } = await supabaseAdmin
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', userId)
      .eq('user_role', userRole)
      .order('created_at', { ascending: false })
      .limit(1);
    res.json({ data: data?.[0] || null });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get KYC status' });
  }
});

export default router;

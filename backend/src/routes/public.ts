import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase';

const router = Router();

router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data } = await supabaseAdmin
      .from('platform_stats')
      .select('key, value');

    const stats: Record<string, number> = {};
    data?.forEach((s: any) => { stats[s.key] = parseFloat(s.value); });

    res.json({ data: stats });
  } catch {
    res.json({ data: {
      total_transactions: 0, total_volume_ghs: 0,
      total_sellers: 0, success_rate: 100,
    }});
  }
});

router.get('/fee-calculator', async (req: Request, res: Response): Promise<void> => {
  try {
    const productTotal = parseFloat(req.query.amount as string) || 0;
    const deliveryFee = parseFloat(req.query.delivery as string) || 0;

    const buyerFeePercent = 0.5;
    const sellerFeePercent = 0.75;
    const riderReleaseFee = 1.0;

    const buyerPlatformFee = parseFloat((productTotal * buyerFeePercent / 100).toFixed(2));
    const sellerPlatformFee = parseFloat((productTotal * sellerFeePercent / 100).toFixed(2));
    const grandTotal = productTotal + deliveryFee + riderReleaseFee + buyerPlatformFee;
    const sellerReceives = productTotal - sellerPlatformFee - riderReleaseFee;

    res.json({
      data: {
        product_total: productTotal,
        delivery_fee: deliveryFee,
        rider_release_fee: riderReleaseFee,
        buyer_platform_fee: buyerPlatformFee,
        seller_platform_fee: sellerPlatformFee,
        grand_total: grandTotal,
        buyer_pays: grandTotal,
        seller_receives: Math.max(0, sellerReceives),
        rider_receives: deliveryFee + riderReleaseFee,
      },
    });
  } catch {
    res.status(500).json({ error: 'Calculation failed' });
  }
});

router.get('/seller/:phone/reputation', async (req: Request, res: Response): Promise<void> => {
  try {
    const phone = req.params.phone;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name')
      .eq('phone', phone)
      .single();

    if (!profile) {
      res.json({ data: { found: false } });
      return;
    }

    const { data: trust } = await supabaseAdmin
      .from('seller_trust_scores')
      .select('trust_score, tier, total_transactions, completed_ok, avg_seller_rating, verified_at')
      .eq('seller_id', profile.user_id)
      .single();

    res.json({
      data: {
        found: true,
        name: profile.full_name,
        trust_score: trust?.trust_score || 50,
        tier: trust?.tier || 'NEW',
        total_transactions: trust?.total_transactions || 0,
        completed: trust?.completed_ok || 0,
        avg_rating: trust?.avg_seller_rating || 0,
        is_verified: !!trust?.verified_at,
      },
    });
  } catch {
    res.json({ data: { found: false } });
  }
});

export default router;

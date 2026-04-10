import { Router, Request, Response } from 'express';
import { authenticateToken, isPrivilegedRole } from '../middleware/auth';
import { supabaseAdmin, auditLog } from '../services/supabase';
import { sendNotification } from '../services/notify';

const router = Router();

type ListingStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';
type ListingType = 'product' | 'service';

function normalizeListingType(value?: string): ListingType | null {
  if (value === 'product' || value === 'service') return value;
  return null;
}

function normalizeListingStatus(value?: string): ListingStatus | null {
  if (!value) return null;
  if (['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED'].includes(value)) return value as ListingStatus;
  return null;
}

function computeIsActive(status: ListingStatus) {
  return status === 'PUBLISHED';
}

// GET /api/marketplace/listings
router.get('/listings', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10), 1), 60);
    const from = (page - 1) * limit;

    const listingType = normalizeListingType(req.query.type as string | undefined);
    const category = (req.query.category as string | undefined)?.trim();
    const sellerId = (req.query.seller_id as string | undefined)?.trim();
    const search = (req.query.search as string | undefined)?.trim();
    const sort = (req.query.sort as string | undefined) || 'newest';
    const minPrice = req.query.min_price ? Number(req.query.min_price) : undefined;
    const maxPrice = req.query.max_price ? Number(req.query.max_price) : undefined;

    let query = supabaseAdmin
      .from('marketplace_listings')
      .select('*', { count: 'exact' })
      .eq('status', 'PUBLISHED')
      .eq('is_active', true);

    if (listingType) query = query.eq('listing_type', listingType);
    if (category) query = query.eq('category', category);
    if (sellerId) query = query.eq('seller_id', sellerId);
    if (Number.isFinite(minPrice)) query = query.gte('price', minPrice as number);
    if (Number.isFinite(maxPrice)) query = query.lte('price', maxPrice as number);
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
    }

    if (sort === 'price_asc') query = query.order('price', { ascending: true });
    else if (sort === 'price_desc') query = query.order('price', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query.range(from, from + limit - 1);
    if (error) throw error;

    const sellerIds = [...new Set((data || []).map((item: any) => item.seller_id).filter(Boolean))];
    const [profilesRes, trustRes] = await Promise.all([
      sellerIds.length
        ? supabaseAdmin
            .from('profiles')
            .select('user_id, full_name, phone')
            .in('user_id', sellerIds)
        : Promise.resolve({ data: [] as any[] } as any),
      sellerIds.length
        ? supabaseAdmin
            .from('seller_trust_scores')
            .select('seller_id, trust_score, tier, verified_at')
            .in('seller_id', sellerIds)
        : Promise.resolve({ data: [] as any[] } as any),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
    const trustMap = new Map((trustRes.data || []).map((t: any) => [t.seller_id, t]));

    const rows = (data || []).map((row: any) => ({
      ...row,
      seller: profileMap.get(row.seller_id) || null,
      seller_trust: trustMap.get(row.seller_id) || null,
    }));

    res.json({ data: rows, total: count || 0, page, limit });
  } catch (err: any) {
    console.error('[MARKETPLACE_LISTINGS]', err.message);
    res.status(500).json({ error: 'Failed to load marketplace listings' });
  }
});

// GET /api/marketplace/listings/:id
router.get('/listings/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('marketplace_listings')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error || !data) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    if (data.status !== 'PUBLISHED' || !data.is_active) {
      res.status(404).json({ error: 'Listing not available' });
      return;
    }

    const [profileRes, trustRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('user_id, full_name, phone')
        .eq('user_id', data.seller_id)
        .single(),
      supabaseAdmin
        .from('seller_trust_scores')
        .select('seller_id, trust_score, tier, verified_at')
        .eq('seller_id', data.seller_id)
        .single(),
    ]);

    res.json({
      data: {
        ...data,
        seller: profileRes.data || null,
        seller_trust: trustRes.data || null,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load listing' });
  }
});

// GET /api/marketplace/seller/my-listings
router.get('/seller/my-listings', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10), 1), 60);
    const from = (page - 1) * limit;
    const status = normalizeListingStatus(req.query.status as string | undefined);
    const type = normalizeListingType(req.query.type as string | undefined);

    let query = supabaseAdmin
      .from('marketplace_listings')
      .select('*', { count: 'exact' })
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('listing_type', type);

    const { data, error, count } = await query.range(from, from + limit - 1);
    if (error) throw error;
    res.json({ data: data || [], total: count || 0, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch your listings' });
  }
});

// POST /api/marketplace/listings
router.post('/listings', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'seller' && !isPrivilegedRole(req.user?.role)) {
      res.status(403).json({ error: 'Only sellers can create listings' });
      return;
    }

    const listingType = normalizeListingType(req.body.listing_type);
    if (!listingType) {
      res.status(400).json({ error: 'listing_type must be product or service' });
      return;
    }
    if (!req.body.title || !String(req.body.title).trim()) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const status = normalizeListingStatus(req.body.status) || 'PUBLISHED';
    const payload = {
      seller_id: req.user!.id,
      listing_type: listingType,
      title: String(req.body.title).trim(),
      description: req.body.description || null,
      category: req.body.category || null,
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      price: Number(req.body.price || 0),
      currency: req.body.currency || 'GHS',
      cover_image_url: req.body.cover_image_url || null,
      image_urls: Array.isArray(req.body.image_urls) ? req.body.image_urls : [],
      location_text: req.body.location_text || null,
      inventory_count: req.body.inventory_count ?? null,
      status,
      is_active: computeIsActive(status),
      metadata: req.body.metadata || {},
    };

    const { data, error } = await supabaseAdmin
      .from('marketplace_listings')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;

    await auditLog({
      actor_id: req.user!.id,
      action: 'MARKETPLACE_LISTING_CREATED',
      entity: 'marketplace_listings',
      entity_id: data.id,
      after_state: { title: data.title, status: data.status, listing_type: data.listing_type },
      request_id: req.requestId,
    });
    await sendNotification('LISTING_CREATED', data.id);

    res.status(201).json({ data });
  } catch (err: any) {
    console.error('[CREATE_LISTING]', err.message);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// PUT /api/marketplace/listings/:id
router.put('/listings/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('marketplace_listings')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (fetchErr || !existing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    if (existing.seller_id !== req.user!.id && !isPrivilegedRole(req.user!.role)) {
      res.status(403).json({ error: 'You do not have access to this listing' });
      return;
    }

    const nextType = req.body.listing_type ? normalizeListingType(req.body.listing_type) : existing.listing_type;
    const nextStatus = normalizeListingStatus(req.body.status) || existing.status;

    const updates = {
      listing_type: nextType,
      title: req.body.title !== undefined ? String(req.body.title).trim() : existing.title,
      description: req.body.description !== undefined ? req.body.description : existing.description,
      category: req.body.category !== undefined ? req.body.category : existing.category,
      tags: Array.isArray(req.body.tags) ? req.body.tags : existing.tags,
      price: req.body.price !== undefined ? Number(req.body.price) : existing.price,
      currency: req.body.currency !== undefined ? req.body.currency : existing.currency,
      cover_image_url: req.body.cover_image_url !== undefined ? req.body.cover_image_url : existing.cover_image_url,
      image_urls: Array.isArray(req.body.image_urls) ? req.body.image_urls : existing.image_urls,
      location_text: req.body.location_text !== undefined ? req.body.location_text : existing.location_text,
      inventory_count: req.body.inventory_count !== undefined ? req.body.inventory_count : existing.inventory_count,
      status: nextStatus,
      is_active: computeIsActive(nextStatus),
      metadata: req.body.metadata !== undefined ? req.body.metadata : existing.metadata,
    };

    const { data, error } = await supabaseAdmin
      .from('marketplace_listings')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw error;

    await auditLog({
      actor_id: req.user!.id,
      action: 'MARKETPLACE_LISTING_UPDATED',
      entity: 'marketplace_listings',
      entity_id: data.id,
      before_state: { title: existing.title, status: existing.status, price: existing.price },
      after_state: { title: data.title, status: data.status, price: data.price },
      request_id: req.requestId,
    });
    await sendNotification('LISTING_UPDATED', data.id);

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// PATCH /api/marketplace/listings/:id/status
router.patch('/listings/:id/status', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = normalizeListingStatus(req.body.status);
    if (!status) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const { data: listing } = await supabaseAdmin
      .from('marketplace_listings')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    if (listing.seller_id !== req.user!.id && !isPrivilegedRole(req.user!.role)) {
      res.status(403).json({ error: 'You do not have access to this listing' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('marketplace_listings')
      .update({ status, is_active: computeIsActive(status) })
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw error;

    await auditLog({
      actor_id: req.user!.id,
      action: 'MARKETPLACE_LISTING_STATUS_UPDATED',
      entity: 'marketplace_listings',
      entity_id: data.id,
      before_state: { status: listing.status },
      after_state: { status: data.status },
      request_id: req.requestId,
    });
    await sendNotification(status === 'PUBLISHED' ? 'LISTING_PUBLISHED' : 'LISTING_UPDATED', data.id);

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update listing status' });
  }
});

// DELETE /api/marketplace/listings/:id
router.delete('/listings/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: listing } = await supabaseAdmin
      .from('marketplace_listings')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    if (listing.seller_id !== req.user!.id && !isPrivilegedRole(req.user!.role)) {
      res.status(403).json({ error: 'You do not have access to this listing' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('marketplace_listings')
      .update({ status: 'ARCHIVED', is_active: false })
      .eq('id', req.params.id);
    if (error) throw error;

    await auditLog({
      actor_id: req.user!.id,
      action: 'MARKETPLACE_LISTING_ARCHIVED',
      entity: 'marketplace_listings',
      entity_id: listing.id,
      before_state: { status: listing.status },
      after_state: { status: 'ARCHIVED' },
      request_id: req.requestId,
    });
    await sendNotification('LISTING_UPDATED', listing.id);

    res.json({ data: { ok: true } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to archive listing' });
  }
});

export default router;

-- ============================================================
-- Marketplace Listings (Products + Services)
-- ============================================================

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('product', 'service')),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  cover_image_url TEXT,
  image_urls JSONB NOT NULL DEFAULT '[]'::JSONB,
  location_text TEXT,
  inventory_count INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED')),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status
  ON marketplace_listings (status, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_type
  ON marketplace_listings (listing_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category
  ON marketplace_listings (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller
  ON marketplace_listings (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_price
  ON marketplace_listings (price);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_marketplace_listings_updated_at'
  ) THEN
    CREATE TRIGGER trg_marketplace_listings_updated_at
      BEFORE UPDATE ON marketplace_listings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END$$;

ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'marketplace_listings' AND policyname = 'Public can view published marketplace listings'
  ) THEN
    CREATE POLICY "Public can view published marketplace listings"
      ON marketplace_listings FOR SELECT
      USING (status = 'PUBLISHED' AND is_active = TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'marketplace_listings' AND policyname = 'Sellers can view own listings'
  ) THEN
    CREATE POLICY "Sellers can view own listings"
      ON marketplace_listings FOR SELECT
      USING (seller_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'marketplace_listings' AND policyname = 'Sellers can create own listings'
  ) THEN
    CREATE POLICY "Sellers can create own listings"
      ON marketplace_listings FOR INSERT
      WITH CHECK (seller_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'marketplace_listings' AND policyname = 'Sellers can update own listings'
  ) THEN
    CREATE POLICY "Sellers can update own listings"
      ON marketplace_listings FOR UPDATE
      USING (seller_id = auth.uid())
      WITH CHECK (seller_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'marketplace_listings' AND policyname = 'Sellers can delete own listings'
  ) THEN
    CREATE POLICY "Sellers can delete own listings"
      ON marketplace_listings FOR DELETE
      USING (seller_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'marketplace_listings' AND policyname = 'Admins manage marketplace listings'
  ) THEN
    CREATE POLICY "Admins manage marketplace listings"
      ON marketplace_listings FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM profiles p
          WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'superadmin')
        )
      );
  END IF;
END$$;

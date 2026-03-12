-- ============================================================
-- Advanced Features: Trust Scores, Fraud Detection, Auto-Release
-- ============================================================

-- ============================================================
-- SELLER TRUST SCORES (reputation system)
-- ============================================================

CREATE TABLE seller_trust_scores (
  seller_id           UUID PRIMARY KEY REFERENCES auth.users(id),
  total_transactions  INT NOT NULL DEFAULT 0,
  completed_ok        INT NOT NULL DEFAULT 0,
  disputes_lost       INT NOT NULL DEFAULT 0,
  disputes_won        INT NOT NULL DEFAULT 0,
  avg_delivery_hours  NUMERIC(8,2),
  avg_seller_rating   NUMERIC(3,2),
  total_volume_ghs    NUMERIC(14,2) NOT NULL DEFAULT 0,
  trust_score         NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  tier                TEXT NOT NULL DEFAULT 'NEW',
  verified_at         TIMESTAMPTZ,
  last_calculated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE seller_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read trust scores"
  ON seller_trust_scores FOR SELECT USING (true);

CREATE POLICY "Admin manages trust scores"
  ON seller_trust_scores FOR ALL USING (is_admin());

-- ============================================================
-- FRAUD RISK FLAGS
-- ============================================================

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fraud_score NUMERIC(5,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fraud_flags JSONB DEFAULT '[]'::JSONB;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_txn_fraud_score ON transactions(fraud_score) WHERE fraud_score > 50;
CREATE INDEX idx_txn_auto_release ON transactions(auto_release_at) WHERE auto_release_at IS NOT NULL;

-- ============================================================
-- TRANSACTION RECEIPTS (generated receipts for sharing)
-- ============================================================

CREATE TABLE transaction_receipts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id),
  receipt_number  TEXT UNIQUE NOT NULL,
  receipt_type    TEXT NOT NULL, -- 'PAYMENT', 'DELIVERY', 'PAYOUT'
  data            JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_receipts_txn ON transaction_receipts(transaction_id);

ALTER TABLE transaction_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read own receipts"
  ON transaction_receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_receipts.transaction_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
    OR is_admin()
  );

-- ============================================================
-- SELLER VERIFICATION REQUESTS
-- ============================================================

CREATE TABLE seller_verifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id     UUID NOT NULL REFERENCES auth.users(id),
  business_name TEXT NOT NULL,
  business_type TEXT,
  ghana_card_number TEXT,
  tin_number    TEXT,
  business_location TEXT,
  social_links  JSONB,
  status        TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  reviewed_by   UUID REFERENCES auth.users(id),
  reviewed_at   TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE seller_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers see own verification"
  ON seller_verifications FOR SELECT
  USING (seller_id = auth.uid() OR is_admin());

CREATE POLICY "Sellers submit verification"
  ON seller_verifications FOR INSERT
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Admin manages verifications"
  ON seller_verifications FOR ALL USING (is_admin());

-- ============================================================
-- SCHEDULED JOBS TRACKING
-- ============================================================

CREATE TABLE scheduled_jobs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type      TEXT NOT NULL, -- 'AUTO_RELEASE', 'EXPIRY_CHECK', 'TRUST_RECALC'
  entity_id     TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at   TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'PENDING',
  result        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_pending ON scheduled_jobs(scheduled_for)
  WHERE status = 'PENDING';

-- ============================================================
-- PLATFORM STATISTICS (materialized for homepage)
-- ============================================================

CREATE TABLE platform_stats (
  key         TEXT PRIMARY KEY,
  value       NUMERIC NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_stats (key, value) VALUES
  ('total_transactions', 0),
  ('total_volume_ghs', 0),
  ('total_payouts_ghs', 0),
  ('total_sellers', 0),
  ('total_buyers', 0),
  ('avg_delivery_hours', 0),
  ('disputes_resolved', 0),
  ('success_rate', 100);

ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform stats"
  ON platform_stats FOR SELECT USING (true);

CREATE POLICY "Admin manages platform stats"
  ON platform_stats FOR ALL USING (is_admin());

-- ============================================================
-- FUNCTION: Calculate seller trust score
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_trust_score(p_seller_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total INT;
  v_completed INT;
  v_disputes_lost INT;
  v_avg_rating NUMERIC;
  v_volume NUMERIC;
  v_score NUMERIC;
  v_tier TEXT;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'COMPLETED'),
    COUNT(*) FILTER (WHERE status IN ('DISPUTE', 'CANCELLED'))
  INTO v_total, v_completed, v_disputes_lost
  FROM transactions WHERE seller_id = p_seller_id;

  SELECT COALESCE(AVG(seller_rating), 0) INTO v_avg_rating
  FROM reviews r
  JOIN transactions t ON t.id = r.transaction_id
  WHERE t.seller_id = p_seller_id AND r.status = 'APPROVED';

  SELECT COALESCE(SUM(product_total), 0) INTO v_volume
  FROM transactions WHERE seller_id = p_seller_id AND status = 'COMPLETED';

  -- Score calculation (0-100)
  v_score := 50; -- base
  IF v_total > 0 THEN
    v_score := v_score + (v_completed::NUMERIC / v_total * 25);  -- completion rate (up to 25)
    v_score := v_score - (v_disputes_lost::NUMERIC / v_total * 20); -- dispute penalty
  END IF;
  v_score := v_score + LEAST(v_avg_rating * 3, 15);  -- rating bonus (up to 15)
  v_score := v_score + LEAST(v_volume / 10000, 10);   -- volume bonus (up to 10)
  v_score := GREATEST(0, LEAST(100, v_score));

  -- Tier
  IF v_score >= 90 AND v_total >= 20 THEN v_tier := 'PLATINUM';
  ELSIF v_score >= 75 AND v_total >= 10 THEN v_tier := 'GOLD';
  ELSIF v_score >= 60 AND v_total >= 5 THEN v_tier := 'SILVER';
  ELSIF v_total >= 1 THEN v_tier := 'BRONZE';
  ELSE v_tier := 'NEW';
  END IF;

  INSERT INTO seller_trust_scores (seller_id, total_transactions, completed_ok, disputes_lost, avg_seller_rating, total_volume_ghs, trust_score, tier, last_calculated_at)
  VALUES (p_seller_id, v_total, v_completed, v_disputes_lost, v_avg_rating, v_volume, v_score, v_tier, now())
  ON CONFLICT (seller_id) DO UPDATE SET
    total_transactions = EXCLUDED.total_transactions,
    completed_ok = EXCLUDED.completed_ok,
    disputes_lost = EXCLUDED.disputes_lost,
    avg_seller_rating = EXCLUDED.avg_seller_rating,
    total_volume_ghs = EXCLUDED.total_volume_ghs,
    trust_score = EXCLUDED.trust_score,
    tier = EXCLUDED.tier,
    last_calculated_at = now();

  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Update platform stats
-- ============================================================

CREATE OR REPLACE FUNCTION refresh_platform_stats()
RETURNS VOID AS $$
BEGIN
  UPDATE platform_stats SET value = (SELECT COUNT(*) FROM transactions), updated_at = now() WHERE key = 'total_transactions';
  UPDATE platform_stats SET value = (SELECT COALESCE(SUM(grand_total), 0) FROM transactions WHERE status NOT IN ('SUBMITTED', 'CANCELLED')), updated_at = now() WHERE key = 'total_volume_ghs';
  UPDATE platform_stats SET value = (SELECT COALESCE(SUM(amount), 0) FROM payouts WHERE status = 'SUCCESS'), updated_at = now() WHERE key = 'total_payouts_ghs';
  UPDATE platform_stats SET value = (SELECT COUNT(DISTINCT seller_id) FROM transactions WHERE seller_id IS NOT NULL), updated_at = now() WHERE key = 'total_sellers';
  UPDATE platform_stats SET value = (SELECT COUNT(DISTINCT buyer_id) FROM transactions), updated_at = now() WHERE key = 'total_buyers';
  UPDATE platform_stats SET value = (SELECT COUNT(*) FROM disputes WHERE status = 'RESOLVED'), updated_at = now() WHERE key = 'disputes_resolved';
  UPDATE platform_stats SET value = (
    SELECT CASE WHEN COUNT(*) > 0
      THEN ROUND(COUNT(*) FILTER (WHERE status = 'COMPLETED')::NUMERIC / COUNT(*) * 100, 1)
      ELSE 100 END
    FROM transactions WHERE status NOT IN ('SUBMITTED')
  ), updated_at = now() WHERE key = 'success_rate';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add additional settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('whatsapp_support_number', '+233000000000', 'WhatsApp support number'),
  ('auto_release_enabled', 'true', 'Enable automatic fund release after delivery'),
  ('seller_verification_required', 'false', 'Require seller verification for payouts above threshold'),
  ('seller_verification_threshold', '5000', 'GHS threshold requiring seller verification'),
  ('fraud_detection_enabled', 'true', 'Enable automated fraud scoring'),
  ('fraud_auto_hold_score', '75', 'Auto-hold transactions with fraud score above this')
ON CONFLICT (key) DO NOTHING;

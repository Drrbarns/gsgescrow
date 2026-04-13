-- ============================================================
-- Sell-Safe Buy-Safe: Initial Schema Migration
-- ============================================================

-- Enums
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');
CREATE TYPE product_type AS ENUM ('food', 'non_food');
CREATE TYPE source_platform AS ENUM ('facebook', 'instagram', 'website', 'whatsapp', 'tiktok', 'x', 'other');
CREATE TYPE transaction_status AS ENUM (
  'SUBMITTED', 'PAID', 'DISPATCHED', 'IN_TRANSIT',
  'DELIVERED_PENDING', 'REPLACEMENT_PENDING', 'DELIVERED_CONFIRMED',
  'COMPLETED', 'DISPUTE', 'CANCELLED', 'HOLD'
);
CREATE TYPE payout_type AS ENUM ('RIDER', 'SELLER');
CREATE TYPE payout_status AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED', 'HELD');
CREATE TYPE ledger_bucket AS ENUM ('PRODUCT', 'DELIVERY', 'PLATFORM');
CREATE TYPE ledger_direction AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE dispute_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');
CREATE TYPE review_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE notification_channel AS ENUM ('LOG', 'SMS', 'WHATSAPP', 'EMAIL');
CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'FAILED');

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  full_name VARCHAR(255),
  role user_role NOT NULL DEFAULT 'buyer',
  ghana_card_name VARCHAR(255),
  refund_bank_details JSONB,
  momo_details JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id VARCHAR(12) NOT NULL UNIQUE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  seller_id UUID REFERENCES auth.users(id),
  seller_phone VARCHAR(20) NOT NULL,
  seller_name VARCHAR(255) NOT NULL,
  buyer_name VARCHAR(255) NOT NULL,
  buyer_phone VARCHAR(20) NOT NULL,
  listing_link TEXT,
  source_platform source_platform NOT NULL DEFAULT 'other',
  product_type product_type NOT NULL,
  product_name VARCHAR(500) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_date DATE,
  product_total NUMERIC(12,2) NOT NULL CHECK (product_total > 0),
  delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  rider_release_fee NUMERIC(12,2) NOT NULL DEFAULT 1.00,
  buyer_platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  seller_platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL CHECK (grand_total > 0),
  status transaction_status NOT NULL DEFAULT 'SUBMITTED',
  paystack_reference VARCHAR(100) UNIQUE,
  paystack_access_code VARCHAR(100),
  paystack_authorization_url TEXT,
  paid_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  seller_business_location TEXT,
  rider_name VARCHAR(255),
  rider_phone VARCHAR(20),
  rider_telco VARCHAR(50),
  pickup_address TEXT,
  additional_info TEXT,
  seller_payout_destination JSONB,
  top_up_amount NUMERIC(12,2) DEFAULT 0,
  rider_momo_number VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON transactions(seller_id);
CREATE INDEX idx_transactions_seller_phone ON transactions(seller_phone);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_short_id ON transactions(short_id);
CREATE INDEX idx_transactions_paystack_ref ON transactions(paystack_reference);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- ============================================================
-- TRANSACTION CODES
-- ============================================================
CREATE TABLE transaction_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  delivery_code_hash VARCHAR(128),
  partial_code_hash VARCHAR(128),
  delivery_code_expires_at TIMESTAMPTZ,
  partial_code_expires_at TIMESTAMPTZ,
  delivery_attempts INT NOT NULL DEFAULT 0,
  partial_attempts INT NOT NULL DEFAULT 0,
  delivery_locked_until TIMESTAMPTZ,
  partial_locked_until TIMESTAMPTZ,
  delivery_verified BOOLEAN NOT NULL DEFAULT false,
  partial_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- LEDGER ENTRIES (Internal protected-funds accounting)
-- ============================================================
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  bucket ledger_bucket NOT NULL,
  direction ledger_direction NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  ref VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_txn ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_bucket ON ledger_entries(bucket);

-- ============================================================
-- PAYOUTS
-- ============================================================
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  type payout_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  destination JSONB NOT NULL,
  status payout_status NOT NULL DEFAULT 'PENDING',
  provider_ref VARCHAR(255),
  transfer_code VARCHAR(255),
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  held_reason TEXT,
  held_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payouts_txn ON payouts(transaction_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_idempotency ON payouts(idempotency_key);

-- ============================================================
-- DISPUTES
-- ============================================================
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  opened_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status dispute_status NOT NULL DEFAULT 'OPEN',
  resolution TEXT,
  resolution_action VARCHAR(50),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_txn ON disputes(transaction_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ============================================================
-- DISPUTE EVIDENCE
-- ============================================================
CREATE TABLE dispute_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  storage_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_dispute ON dispute_evidence(dispute_id);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  seller_rating INT CHECK (seller_rating BETWEEN 1 AND 5),
  delivery_rating INT CHECK (delivery_rating BETWEEN 1 AND 5),
  comment TEXT,
  status review_status NOT NULL DEFAULT 'PENDING',
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_txn ON reviews(transaction_id);
CREATE INDEX idx_reviews_buyer ON reviews(buyer_id);
CREATE UNIQUE INDEX idx_reviews_unique ON reviews(transaction_id, buyer_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  phone VARCHAR(20),
  channel notification_channel NOT NULL DEFAULT 'LOG',
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB,
  status notification_status NOT NULL DEFAULT 'PENDING',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id UUID,
  before_state JSONB,
  after_state JSONB,
  reason TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  request_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================
-- PLATFORM SETTINGS (Admin-configurable)
-- ============================================================
CREATE TABLE platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (key, value, description) VALUES
  ('buyer_fee_percent', '0.5', 'Buyer platform fee percentage'),
  ('seller_fee_percent', '0.75', 'Seller platform fee percentage'),
  ('rider_release_fee', '1.00', 'Fixed rider release fee in GHS'),
  ('delivery_code_length', '7', 'Length of delivery code'),
  ('partial_code_length', '4', 'Length of partial code'),
  ('code_expiry_hours', '72', 'Hours before codes expire'),
  ('max_code_attempts', '5', 'Max verification attempts before lockout'),
  ('code_lockout_minutes', '30', 'Lockout duration after max attempts'),
  ('payout_max_retries', '5', 'Max payout retry attempts'),
  ('payout_retry_backoff_minutes', '5', 'Base backoff minutes for payout retries');

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payouts_updated_at
  BEFORE UPDATE ON payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'SBS-';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_short_id()
RETURNS TRIGGER AS $$
DECLARE
  new_id TEXT;
  done BOOLEAN := false;
BEGIN
  WHILE NOT done LOOP
    new_id := generate_short_id();
    done := NOT EXISTS(SELECT 1 FROM transactions WHERE short_id = new_id);
  END LOOP;
  NEW.short_id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transactions_short_id
  BEFORE INSERT ON transactions FOR EACH ROW
  WHEN (NEW.short_id IS NULL OR NEW.short_id = '')
  EXECUTE FUNCTION set_short_id();

-- Helper to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY profiles_own_read ON profiles FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY profiles_own_update ON profiles FOR UPDATE USING (user_id = auth.uid() OR is_admin());
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (user_id = auth.uid());

-- TRANSACTIONS
CREATE POLICY txn_buyer_read ON transactions FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR is_admin());

CREATE POLICY txn_buyer_insert ON transactions FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY txn_buyer_update ON transactions FOR UPDATE
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR is_admin());

-- TRANSACTION CODES: only via service role (backend) or admin
CREATE POLICY codes_admin_read ON transaction_codes FOR SELECT USING (is_admin());

-- LEDGER ENTRIES: read-only for involved parties, write only via service role
CREATE POLICY ledger_read ON ledger_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = ledger_entries.transaction_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
    OR is_admin()
  );

-- PAYOUTS
CREATE POLICY payouts_read ON payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = payouts.transaction_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
    OR is_admin()
  );

CREATE POLICY payouts_admin_all ON payouts FOR ALL USING (is_admin());

-- DISPUTES
CREATE POLICY disputes_read ON disputes FOR SELECT
  USING (opened_by = auth.uid() OR is_admin());

CREATE POLICY disputes_insert ON disputes FOR INSERT
  WITH CHECK (opened_by = auth.uid());

CREATE POLICY disputes_admin_update ON disputes FOR UPDATE USING (is_admin());

-- DISPUTE EVIDENCE
CREATE POLICY evidence_read ON dispute_evidence FOR SELECT
  USING (
    uploaded_by = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM disputes d WHERE d.id = dispute_evidence.dispute_id AND d.opened_by = auth.uid()
    )
  );

CREATE POLICY evidence_insert ON dispute_evidence FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- REVIEWS
CREATE POLICY reviews_read ON reviews FOR SELECT USING (true);
CREATE POLICY reviews_insert ON reviews FOR INSERT WITH CHECK (buyer_id = auth.uid());
CREATE POLICY reviews_admin_update ON reviews FOR UPDATE USING (is_admin());

-- NOTIFICATIONS
CREATE POLICY notifications_own ON notifications FOR SELECT USING (user_id = auth.uid() OR is_admin());

-- AUDIT LOGS: admin only
CREATE POLICY audit_admin ON audit_logs FOR SELECT USING (is_admin());

-- PLATFORM SETTINGS: admin only
CREATE POLICY settings_admin_read ON platform_settings FOR SELECT USING (is_admin());
CREATE POLICY settings_admin_update ON platform_settings FOR UPDATE USING (is_admin());
CREATE POLICY settings_admin_insert ON platform_settings FOR INSERT WITH CHECK (is_admin());

-- ============================================================
-- STORAGE BUCKETS (run via Supabase SQL or API)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence',
  'evidence',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY storage_evidence_upload ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'evidence' AND auth.uid() IS NOT NULL);

CREATE POLICY storage_evidence_read ON storage.objects FOR SELECT
  USING (bucket_id = 'evidence' AND (auth.uid() IS NOT NULL));

CREATE POLICY storage_evidence_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'evidence' AND (owner = auth.uid()::text OR (SELECT is_admin())));

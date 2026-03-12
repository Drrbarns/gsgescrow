-- ============================================================
-- Sell-Safe Buy-Safe: Complete Database Schema
-- Run against your Supabase Postgres instance
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CUSTOM TYPES (ENUMS)
-- ============================================================

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

-- ============================================================
-- PROFILES
-- ============================================================

CREATE TABLE profiles (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone      TEXT NOT NULL,
  full_name  TEXT NOT NULL DEFAULT '',
  ghana_card_name TEXT,
  role       user_role NOT NULL DEFAULT 'buyer',
  refund_bank_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================================
-- SHORT ID SEQUENCE (SBS-XXXXXXXX)
-- ============================================================

CREATE SEQUENCE txn_short_id_seq START 10000;

CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'SBS-' || LPAD(nextval('txn_short_id_seq')::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRANSACTIONS
-- ============================================================

CREATE TABLE transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  short_id         TEXT UNIQUE NOT NULL DEFAULT generate_short_id(),
  buyer_id         UUID NOT NULL REFERENCES auth.users(id),
  seller_id        UUID REFERENCES auth.users(id),
  buyer_name       TEXT NOT NULL,
  buyer_phone      TEXT NOT NULL,
  seller_name      TEXT NOT NULL,
  seller_phone     TEXT NOT NULL,
  listing_link     TEXT,
  source_platform  source_platform NOT NULL,
  product_type     product_type NOT NULL,
  product_name     TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_date    DATE,
  status           transaction_status NOT NULL DEFAULT 'SUBMITTED',

  -- Financial
  product_total       NUMERIC(12,2) NOT NULL CHECK (product_total >= 0),
  delivery_fee        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  rider_release_fee   NUMERIC(12,2) NOT NULL DEFAULT 1.00,
  buyer_platform_fee  NUMERIC(12,2) NOT NULL DEFAULT 0,
  seller_platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total         NUMERIC(12,2) NOT NULL CHECK (grand_total >= 0),

  -- Paystack
  paystack_reference        TEXT,
  paystack_access_code      TEXT,
  paystack_authorization_url TEXT,

  -- Seller dispatch info
  seller_business_location TEXT,
  rider_name               TEXT,
  rider_phone              TEXT,
  rider_telco              TEXT,
  rider_momo_number        TEXT,
  pickup_address           TEXT,
  additional_info          TEXT,
  seller_payout_destination JSONB,

  -- Timestamps
  paid_at      TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_txn_buyer ON transactions(buyer_id);
CREATE INDEX idx_txn_seller ON transactions(seller_id);
CREATE INDEX idx_txn_status ON transactions(status);
CREATE INDEX idx_txn_seller_phone ON transactions(seller_phone);
CREATE INDEX idx_txn_buyer_phone ON transactions(buyer_phone);
CREATE INDEX idx_txn_short_id ON transactions(short_id);
CREATE INDEX idx_txn_created ON transactions(created_at DESC);

-- ============================================================
-- TRANSACTION CODES (delivery + partial)
-- ============================================================

CREATE TABLE transaction_codes (
  transaction_id         UUID PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
  delivery_code_hash     TEXT,
  partial_code_hash      TEXT,
  delivery_code_expires_at TIMESTAMPTZ,
  partial_code_expires_at  TIMESTAMPTZ,
  delivery_attempts      INT NOT NULL DEFAULT 0,
  partial_attempts       INT NOT NULL DEFAULT 0,
  delivery_locked_until  TIMESTAMPTZ,
  partial_locked_until   TIMESTAMPTZ,
  delivery_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  partial_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PAYOUTS
-- ============================================================

CREATE TABLE payouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id),
  type            payout_type NOT NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  destination     JSONB NOT NULL,
  status          payout_status NOT NULL DEFAULT 'PENDING',
  provider_ref    TEXT,
  transfer_code   TEXT,
  idempotency_key TEXT UNIQUE,
  attempts        INT NOT NULL DEFAULT 0,
  max_attempts    INT NOT NULL DEFAULT 5,
  last_error      TEXT,
  next_retry_at   TIMESTAMPTZ,
  held_reason     TEXT,
  held_by         UUID REFERENCES auth.users(id),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payouts_txn ON payouts(transaction_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_idempotency ON payouts(idempotency_key);

-- ============================================================
-- LEDGER ENTRIES (Internal escrow accounting)
-- ============================================================

CREATE TABLE ledger_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id),
  bucket          ledger_bucket NOT NULL,
  direction       ledger_direction NOT NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  ref             TEXT NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_txn ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_bucket ON ledger_entries(bucket);

-- ============================================================
-- DISPUTES
-- ============================================================

CREATE TABLE disputes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id),
  opened_by       UUID NOT NULL REFERENCES auth.users(id),
  reason          TEXT NOT NULL,
  status          dispute_status NOT NULL DEFAULT 'OPEN',
  resolution      TEXT,
  resolution_action TEXT,
  notes           TEXT,
  resolved_by     UUID REFERENCES auth.users(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_txn ON disputes(transaction_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ============================================================
-- DISPUTE EVIDENCE
-- ============================================================

CREATE TABLE dispute_evidence (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id    UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES auth.users(id),
  storage_path  TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  file_size     INT NOT NULL DEFAULT 0,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_dispute ON dispute_evidence(dispute_id);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id),
  buyer_id        UUID NOT NULL REFERENCES auth.users(id),
  seller_rating   INT CHECK (seller_rating BETWEEN 1 AND 5),
  delivery_rating INT CHECK (delivery_rating BETWEEN 1 AND 5),
  comment         TEXT,
  status          review_status NOT NULL DEFAULT 'PENDING',
  moderated_by    UUID REFERENCES auth.users(id),
  moderated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_txn ON reviews(transaction_id);
CREATE INDEX idx_reviews_buyer ON reviews(buyer_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE UNIQUE INDEX idx_reviews_unique ON reviews(transaction_id, buyer_id);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id     UUID REFERENCES auth.users(id),
  action       TEXT NOT NULL,
  entity       TEXT NOT NULL,
  entity_id    TEXT,
  before_state JSONB,
  after_state  JSONB,
  reason       TEXT,
  ip_address   TEXT,
  request_id   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id),
  phone       TEXT,
  channel     notification_channel NOT NULL DEFAULT 'LOG',
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'PENDING',
  sent_at     TIMESTAMPTZ,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_user ON notifications(user_id);

-- ============================================================
-- PLATFORM SETTINGS (admin-configurable)
-- ============================================================

CREATE TABLE platform_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES auth.users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (key, value, description) VALUES
  ('buyer_fee_percent', '0.5', 'Buyer platform fee as percentage of product total'),
  ('seller_fee_percent', '0.75', 'Seller platform fee as percentage of product total'),
  ('rider_release_fee', '1.00', 'Fixed rider release fee in GHS'),
  ('delivery_code_length', '7', 'Length of delivery code'),
  ('partial_code_length', '4', 'Length of partial code'),
  ('code_expiry_hours', '72', 'Hours before codes expire'),
  ('max_code_attempts', '5', 'Maximum code verification attempts before lockout'),
  ('lockout_minutes', '30', 'Lockout duration in minutes after max attempts'),
  ('payout_max_retries', '5', 'Maximum payout retry attempts'),
  ('auto_release_hours', '72', 'Hours after delivery to auto-release funds');

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_transactions_updated
  BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_payouts_updated
  BEFORE UPDATE ON payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_disputes_updated
  BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: Auto-create profile on auth signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, phone, role)
  VALUES (NEW.id, COALESCE(NEW.phone, ''), 'buyer')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

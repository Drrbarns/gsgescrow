-- ============================================================
-- KYC VERIFICATION CONTROL PLANE (BUYER + SELLER)
-- ============================================================

CREATE TABLE IF NOT EXISTS kyc_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_role TEXT NOT NULL CHECK (user_role IN ('buyer', 'seller')),
  full_name TEXT NOT NULL,
  id_type TEXT NOT NULL DEFAULT 'ghana_card',
  id_number TEXT,
  business_name TEXT,
  business_type TEXT,
  tax_number TEXT,
  phone TEXT,
  address TEXT,
  country TEXT DEFAULT 'Ghana',
  notes TEXT,
  document_front_url TEXT,
  document_back_url TEXT,
  selfie_url TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REQUIRES_RESUBMISSION')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_verifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_role_status ON kyc_verifications(user_role, status, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_kyc_verifications_updated_at'
  ) THEN
    CREATE TRIGGER trg_kyc_verifications_updated_at
      BEFORE UPDATE ON kyc_verifications
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END$$;

ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'kyc_verifications' AND policyname = 'Users read own KYC'
  ) THEN
    CREATE POLICY "Users read own KYC"
      ON kyc_verifications FOR SELECT
      USING (user_id = auth.uid() OR is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'kyc_verifications' AND policyname = 'Users submit own KYC'
  ) THEN
    CREATE POLICY "Users submit own KYC"
      ON kyc_verifications FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'kyc_verifications' AND policyname = 'Admins manage KYC'
  ) THEN
    CREATE POLICY "Admins manage KYC"
      ON kyc_verifications FOR ALL
      USING (is_admin());
  END IF;
END$$;

INSERT INTO platform_settings (key, value, description)
VALUES
  ('kyc_required_buyer', 'true', 'Require buyer KYC for risk-gated features'),
  ('kyc_required_seller', 'true', 'Require seller KYC for payout and trust badge'),
  ('kyc_auto_approve', 'false', 'Allow automatic approval for low-risk KYC requests'),
  ('kyc_block_on_reject', 'true', 'Prevent high-trust actions until user resubmits KYC'),
  ('kyc_expiry_days', '365', 'Number of days before approved KYC expires')
ON CONFLICT (key) DO NOTHING;


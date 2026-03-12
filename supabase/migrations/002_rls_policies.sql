-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: check if current user is admin
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin full access to profiles"
  ON profiles FOR ALL
  USING (is_admin());

-- ============================================================
-- TRANSACTIONS
-- ============================================================

CREATE POLICY "Buyers see own transactions"
  ON transactions FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR is_admin());

CREATE POLICY "Buyers create transactions"
  ON transactions FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Participants update own transactions"
  ON transactions FOR UPDATE
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR is_admin());

CREATE POLICY "Admin full access to transactions"
  ON transactions FOR ALL
  USING (is_admin());

-- ============================================================
-- TRANSACTION CODES
-- ============================================================

CREATE POLICY "Transaction participants see codes"
  ON transaction_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_codes.transaction_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
    OR is_admin()
  );

CREATE POLICY "Admin full access to codes"
  ON transaction_codes FOR ALL
  USING (is_admin());

-- ============================================================
-- PAYOUTS
-- ============================================================

CREATE POLICY "Users see own payouts"
  ON payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = payouts.transaction_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
    OR is_admin()
  );

CREATE POLICY "Admin full access to payouts"
  ON payouts FOR ALL
  USING (is_admin());

-- ============================================================
-- LEDGER ENTRIES (read-only for participants; service role writes)
-- ============================================================

CREATE POLICY "Users see own ledger entries"
  ON ledger_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = ledger_entries.transaction_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
    OR is_admin()
  );

CREATE POLICY "Admin full access to ledger"
  ON ledger_entries FOR ALL
  USING (is_admin());

-- ============================================================
-- DISPUTES
-- ============================================================

CREATE POLICY "Users see own disputes"
  ON disputes FOR SELECT
  USING (opened_by = auth.uid() OR is_admin());

CREATE POLICY "Users create disputes"
  ON disputes FOR INSERT
  WITH CHECK (opened_by = auth.uid());

CREATE POLICY "Admin resolve disputes"
  ON disputes FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin full access to disputes"
  ON disputes FOR ALL
  USING (is_admin());

-- ============================================================
-- DISPUTE EVIDENCE
-- ============================================================

CREATE POLICY "Uploaders and admins see evidence"
  ON dispute_evidence FOR SELECT
  USING (uploaded_by = auth.uid() OR is_admin());

CREATE POLICY "Users upload evidence"
  ON dispute_evidence FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Admin full access to evidence"
  ON dispute_evidence FOR ALL
  USING (is_admin());

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE POLICY "Anyone can read approved reviews"
  ON reviews FOR SELECT
  USING (status = 'APPROVED' OR buyer_id = auth.uid() OR is_admin());

CREATE POLICY "Buyers create reviews"
  ON reviews FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Admin moderate reviews"
  ON reviews FOR UPDATE
  USING (is_admin());

-- ============================================================
-- AUDIT LOGS (read-only for admins; service role writes)
-- ============================================================

CREATE POLICY "Admin read audit logs"
  ON audit_logs FOR SELECT
  USING (is_admin());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- PLATFORM SETTINGS (admin-only)
-- ============================================================

CREATE POLICY "Admin read settings"
  ON platform_settings FOR SELECT
  USING (is_admin());

CREATE POLICY "Admin update settings"
  ON platform_settings FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin insert settings"
  ON platform_settings FOR INSERT
  WITH CHECK (is_admin());

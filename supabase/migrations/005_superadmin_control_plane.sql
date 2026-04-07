-- ============================================================
-- Superadmin Control Plane
-- ============================================================

-- Role extension
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'superadmin'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'superadmin';
  END IF;
END $$;

-- ============================================================
-- IMPERSONATION SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token      TEXT UNIQUE NOT NULL,
  impersonator_id    UUID NOT NULL REFERENCES auth.users(id),
  target_user_id     UUID NOT NULL REFERENCES auth.users(id),
  reason             TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ENDED, EXPIRED
  started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at         TIMESTAMPTZ NOT NULL,
  ended_at           TIMESTAMPTZ,
  ended_reason       TEXT,
  ended_by           UUID REFERENCES auth.users(id),
  request_id         TEXT,
  ip_address         TEXT,
  user_agent         TEXT,
  metadata           JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (impersonator_id <> target_user_id)
);

CREATE INDEX IF NOT EXISTS idx_impersonation_active
  ON impersonation_sessions (status, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_impersonator
  ON impersonation_sessions (impersonator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_target
  ON impersonation_sessions (target_user_id, created_at DESC);

-- ============================================================
-- ADMIN SAVED VIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_saved_views (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id           UUID NOT NULL REFERENCES auth.users(id),
  view_type          TEXT NOT NULL, -- transactions, disputes, payouts, users
  name               TEXT NOT NULL,
  is_default         BOOLEAN NOT NULL DEFAULT FALSE,
  filters            JSONB NOT NULL DEFAULT '{}'::JSONB,
  sort               JSONB NOT NULL DEFAULT '{}'::JSONB,
  columns            JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_saved_views_owner
  ON admin_saved_views (owner_id, view_type, updated_at DESC);

-- ============================================================
-- ADMIN EXPORT JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_export_jobs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by       UUID NOT NULL REFERENCES auth.users(id),
  export_type        TEXT NOT NULL, -- transactions, payouts, disputes, users
  status             TEXT NOT NULL DEFAULT 'QUEUED', -- QUEUED, PROCESSING, COMPLETED, FAILED
  request_filters    JSONB NOT NULL DEFAULT '{}'::JSONB,
  file_path          TEXT,
  file_format        TEXT NOT NULL DEFAULT 'csv',
  error_message      TEXT,
  started_at         TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_export_jobs_status
  ON admin_export_jobs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_export_jobs_requester
  ON admin_export_jobs (requested_by, created_at DESC);

-- ============================================================
-- ALERT RULES + ALERT EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_alert_rules (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key                TEXT UNIQUE NOT NULL, -- dispute_spike, payout_fail_spike, fraud_spike
  name               TEXT NOT NULL,
  enabled            BOOLEAN NOT NULL DEFAULT TRUE,
  threshold          NUMERIC(12,2) NOT NULL DEFAULT 0,
  window_minutes     INT NOT NULL DEFAULT 60,
  severity           TEXT NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  channels           JSONB NOT NULL DEFAULT '["LOG"]'::JSONB,
  created_by         UUID REFERENCES auth.users(id),
  updated_by         UUID REFERENCES auth.users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_alert_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key           TEXT NOT NULL,
  severity           TEXT NOT NULL,
  title              TEXT NOT NULL,
  body               TEXT NOT NULL,
  payload            JSONB,
  status             TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, ACKNOWLEDGED, RESOLVED
  acknowledged_by    UUID REFERENCES auth.users(id),
  acknowledged_at    TIMESTAMPTZ,
  resolved_by        UUID REFERENCES auth.users(id),
  resolved_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_alert_events_status
  ON admin_alert_events (status, created_at DESC);

INSERT INTO admin_alert_rules (key, name, threshold, window_minutes, severity)
VALUES
  ('dispute_spike', 'Dispute Spike', 10, 60, 'HIGH'),
  ('payout_fail_spike', 'Payout Failure Spike', 5, 60, 'CRITICAL'),
  ('fraud_score_spike', 'Fraud Score Spike', 75, 60, 'HIGH')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ADMIN SESSION MONITORING
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id),
  role               user_role NOT NULL,
  session_kind       TEXT NOT NULL DEFAULT 'ADMIN', -- ADMIN, IMPERSONATION
  session_token_hash TEXT,
  status             TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ENDED
  started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at           TIMESTAMPTZ,
  last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address         TEXT,
  user_agent         TEXT,
  metadata           JSONB
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_active
  ON admin_sessions (status, last_seen_at DESC);


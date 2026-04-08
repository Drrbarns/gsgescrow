-- ============================================================
-- Ops Reliability Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS ops_dead_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name TEXT NOT NULL,
  job_id TEXT,
  job_name TEXT,
  failure_class TEXT NOT NULL,
  error_message TEXT,
  attempts_made INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 0,
  is_retryable BOOLEAN NOT NULL DEFAULT FALSE,
  payload_hash TEXT,
  payload JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_dead_letters_queue_time
  ON ops_dead_letters (queue_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_dead_letters_failure_class
  ON ops_dead_letters (failure_class, created_at DESC);

CREATE TABLE IF NOT EXISTS ops_metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT NOT NULL,
  metric_group TEXT NOT NULL,
  metric_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  dimensions JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_metric_snapshots_key_time
  ON ops_metric_snapshots (metric_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_metric_snapshots_group_time
  ON ops_metric_snapshots (metric_group, created_at DESC);

CREATE TABLE IF NOT EXISTS ops_runtime_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  tag TEXT NOT NULL,
  message TEXT NOT NULL,
  request_id TEXT,
  actor_id UUID REFERENCES auth.users(id),
  context JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_runtime_logs_level_time
  ON ops_runtime_logs (level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_runtime_logs_tag_time
  ON ops_runtime_logs (tag, created_at DESC);

INSERT INTO platform_settings (key, value, description)
VALUES
  ('ops_alert_min_interval_sec', '300', 'Minimum seconds between duplicate reliability alerts'),
  ('ops_payout_failure_threshold_1h', '3', 'Alert when payout dead-letters in 1h exceeds threshold'),
  ('ops_sms_failure_ratio_threshold_pct', '25', 'Alert when SMS notification failure ratio exceeds this percent'),
  ('ops_scheduler_drift_threshold_sec', '1200', 'Alert when scheduler drift exceeds this threshold in seconds')
ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_alert_rules (key, name, threshold, window_minutes, severity)
VALUES
  ('sms_fail_ratio', 'SMS Failure Ratio Spike', 25, 60, 'HIGH'),
  ('scheduler_drift', 'Scheduler Drift / Failure', 1, 60, 'HIGH')
ON CONFLICT (key) DO NOTHING;

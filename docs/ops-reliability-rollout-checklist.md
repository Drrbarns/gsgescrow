# Ops Reliability Rollout Checklist

## 1) Environment Setup

- Set `SENTRY_DSN` for backend runtime capture.
- Set `SENTRY_ENV` to deployment target (`staging`, `production`).
- Confirm thresholds:
  - `OPS_ALERT_MIN_INTERVAL_SEC`
  - `OPS_PAYOUT_FAILURE_THRESHOLD_1H`
  - `OPS_SMS_FAILURE_RATIO_THRESHOLD_PCT`
  - `OPS_SCHEDULER_DRIFT_THRESHOLD_SEC`

## 2) Database Migration

- Apply `008_ops_reliability.sql`.
- Verify new tables:
  - `ops_dead_letters`
  - `ops_metric_snapshots`
  - `ops_runtime_logs`
- Verify default `platform_settings` keys and `admin_alert_rules` entries exist.

## 3) Runtime Validation (Staging)

- Hit `/health` and confirm:
  - Redis reports healthy.
  - Queue health reports `payouts`, `notifications`, `scheduler`.
- Trigger a controlled worker failure and verify:
  - Dead letter appears in `ops_dead_letters`.
  - Runtime logs captured in `ops_runtime_logs`.
  - Alert event appears in `admin_alert_events` when thresholds are crossed.

## 4) Admin Console Validation

- Open Admin Reports page and verify:
  - Queue and Redis health block populates.
  - Failure rate cards update.
  - Latest dead letters render.
  - Runtime logs panel filters by level and tag.

## 5) Production Cutover

- Deploy backend and frontend.
- Monitor first 60 minutes:
  - Dead-letter count trend
  - SMS failure ratio trend
  - Scheduler failures
- Acknowledge/triage any open `admin_alert_events`.

# Supabase Setup Guide

## Prerequisites
- Self-hosted Supabase running on Coolify (Postgres + Auth + Storage)
- Access to the Supabase SQL Editor or `psql`

## 1. Run Migrations

Execute the SQL files in order against your Supabase Postgres instance:

```bash
# Option A: Via psql
psql "$DATABASE_URL" -f supabase/migrations/001_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/002_rls_policies.sql
psql "$DATABASE_URL" -f supabase/migrations/003_storage.sql

# Option B: Copy-paste into Supabase SQL Editor (Dashboard → SQL)
```

### Migration Files

| File | Purpose |
|------|---------|
| `001_schema.sql` | All tables, indexes, enums, triggers, and platform settings |
| `002_rls_policies.sql` | Row Level Security policies for every table |
| `003_storage.sql` | Evidence storage bucket + access policies |

## 2. Tables Created

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (linked to `auth.users`) |
| `transactions` | Core transaction records |
| `transaction_codes` | Delivery + partial code hashes |
| `payouts` | Rider and seller payout records |
| `ledger_entries` | Internal transaction accounting |
| `disputes` | Dispute tickets |
| `dispute_evidence` | Evidence file metadata |
| `reviews` | Buyer reviews |
| `audit_logs` | Full audit trail |
| `notifications` | Notification records |
| `platform_settings` | Admin-configurable settings |

## 3. Row Level Security Summary

| Table | Buyer | Seller | Admin | Service Role |
|-------|-------|--------|-------|--------------|
| `profiles` | Own only | Own only | All | Bypass |
| `transactions` | Own (buyer_id) | Own (seller_id) | All | Bypass |
| `transaction_codes` | Own transaction | Own transaction | All | Bypass |
| `payouts` | Own transaction | Own transaction | All | Bypass |
| `ledger_entries` | Read own | Read own | All | Bypass (write) |
| `disputes` | Own only | — | All | Bypass |
| `audit_logs` | — | — | Read | Bypass (write) |
| `platform_settings` | — | — | All | Bypass |

## 4. Storage Buckets

| Bucket | Public | Max Size | Types |
|--------|--------|----------|-------|
| `evidence` | Private | 10MB | JPEG, PNG, WebP, GIF, PDF, MP4 |

Upload path convention: `{user_id}/{dispute_id}/{filename}`

## 5. Auth Configuration

1. **Enable Phone Auth** in your Supabase Auth settings.
2. Configure an SMS provider (Twilio, MessageBird, etc.) for OTP delivery.
3. The `handle_new_user` trigger auto-creates a `profiles` row when a user signs up.

## 6. Creating an Admin User

After a user signs up via OTP, promote them to admin:

```sql
UPDATE profiles SET role = 'admin' WHERE phone = '+233XXXXXXXXX';
```

## 7. Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://sellbuysafe.gsgbrands.com.gh
NEXT_PUBLIC_API_URL=https://api.sellbuysafe.gsgbrands.com.gh
```

### Backend (.env)
```
SUPABASE_URL=https://your-supabase-url.com
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret
PAYSTACK_SECRET_KEY=sk_live_...
REDIS_URL=redis://redis:6379
APP_URL=https://sellbuysafe.gsgbrands.com.gh
CORS_ORIGINS=https://sellbuysafe.gsgbrands.com.gh
```

**Where to find these values:**
- `SUPABASE_URL`: Your Supabase instance URL
- `SUPABASE_ANON_KEY`: Supabase Dashboard → Settings → API → anon public key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard → Settings → API → service_role key
- `SUPABASE_JWT_SECRET`: Supabase Dashboard → Settings → API → JWT Secret
- `PAYSTACK_SECRET_KEY`: Paystack Dashboard → Settings → API Keys & Webhooks

# Deployment Guide: Coolify

## Prerequisites
- VPS running Coolify
- Self-hosted Supabase already running on Coolify
- Cloudflare managing DNS for `gsgbrands.com.gh`
- Paystack account with API keys

## 1. DNS Configuration (Cloudflare)

Add these A records pointing to your VPS IP:

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| A | `sellbuysafe` | `YOUR_VPS_IP` | Proxied or DNS Only |
| A | `api.sellbuysafe` | `YOUR_VPS_IP` | DNS Only (recommended) |

## 2. Database Setup

SSH into your VPS and run the migrations against your Supabase Postgres:

```bash
psql "postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres" \
  -f supabase/migrations/001_schema.sql \
  -f supabase/migrations/002_rls_policies.sql \
  -f supabase/migrations/003_storage.sql
```

Or paste each file into the Supabase SQL Editor.

## 3. Coolify Deployment

### Option A: Docker Compose (Recommended)

1. Push the repo to GitHub/GitLab.
2. In Coolify, create a new **Docker Compose** resource.
3. Point it to your repository.
4. Set the compose file path to `docker-compose.yml`.
5. Add all environment variables from `.env.example`.
6. Set the frontend domain to `sellbuysafe.gsgbrands.com.gh`.
7. Set the backend domain to `api.sellbuysafe.gsgbrands.com.gh`.
8. Deploy.

### Option B: Individual Services

Create three resources in Coolify:

**Frontend:**
- Source: Git repository → `frontend/` directory
- Build: Dockerfile
- Domain: `sellbuysafe.gsgbrands.com.gh`
- Port: 3000
- Build args: All `NEXT_PUBLIC_*` variables

**Backend:**
- Source: Git repository → `backend/` directory
- Build: Dockerfile
- Domain: `api.sellbuysafe.gsgbrands.com.gh`
- Port: 4000
- Environment variables: All backend vars

**Redis:**
- Use Coolify's built-in Redis service
- Or add: `redis:7-alpine` with volume for persistence

## 4. SSL

Coolify auto-provisions Let's Encrypt certificates. Ensure:
- Domains are set correctly on each service
- Port 80/443 is open on the VPS firewall
- If using Cloudflare proxy: set SSL mode to "Full (strict)"

## 5. Paystack Webhook

1. Go to Paystack Dashboard → Settings → API Keys & Webhooks
2. Set webhook URL: `https://api.sellbuysafe.gsgbrands.com.gh/api/webhooks/paystack`
3. Paystack uses your secret key for HMAC-SHA512 signature verification (already implemented)

## 6. Environment Variables Reference

| Variable | Where | Example |
|----------|-------|---------|
| `SUPABASE_URL` | Backend | `https://supabase.yourdomain.com` |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | `eyJ...` |
| `SUPABASE_JWT_SECRET` | Backend | `super-secret-jwt-...` |
| `PAYSTACK_SECRET_KEY` | Backend | `sk_live_xxxxx` |
| `REDIS_URL` | Backend | `redis://redis:6379` |
| `APP_URL` | Backend | `https://sellbuysafe.gsgbrands.com.gh` |
| `CORS_ORIGINS` | Backend | `https://sellbuysafe.gsgbrands.com.gh` |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend (build) | `https://supabase.yourdomain.com` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend (build) | `eyJ...` |
| `NEXT_PUBLIC_APP_URL` | Frontend (build) | `https://sellbuysafe.gsgbrands.com.gh` |
| `NEXT_PUBLIC_API_URL` | Frontend (build) | `https://api.sellbuysafe.gsgbrands.com.gh` |

## 7. Post-Deployment

1. **Create admin user**: Sign up via phone OTP, then run:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE phone = '+233XXXXXXXXX';
   ```
2. **Test the webhook**: Create a test transaction on Paystack test mode.
3. **Verify RLS**: Try accessing data as different users to confirm isolation.

## 8. Smoke-Test Checklist

- [ ] Frontend loads at `https://sellbuysafe.gsgbrands.com.gh`
- [ ] Login via phone OTP works
- [ ] Backend health check: `https://api.sellbuysafe.gsgbrands.com.gh/health`
- [ ] Buyer can create a transaction
- [ ] Paystack payment redirect works
- [ ] Paystack webhook updates transaction to PAID
- [ ] Seller can view and dispatch a PAID order
- [ ] Seller receives partial code
- [ ] Buyer can confirm delivery with delivery code
- [ ] Rider payout is queued and processed
- [ ] Seller can collect payout with both codes
- [ ] Admin dashboard loads with KPIs
- [ ] Admin can flag/hold/release payouts
- [ ] Admin can resolve disputes
- [ ] Admin can export finance reports
- [ ] Evidence upload works to Supabase Storage
- [ ] Reviews can be created and moderated

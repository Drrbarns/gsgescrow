# Architecture: Sell-Safe Buy-Safe

## System Overview

Sell-Safe Buy-Safe is a secure transaction platform for online buying and selling in Ghana, powered by licensed payment service providers (PSPs). It holds funds safely until delivery is confirmed, protecting both buyers and sellers.

## Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, TailwindCSS v4, shadcn/ui, Framer Motion |
| Backend API | Express.js 5, TypeScript |
| Job Queue | BullMQ + Redis 7 |
| Database | Supabase Postgres (self-hosted) |
| Auth | Supabase Auth (Phone OTP) |
| File Storage | Supabase Storage (private `evidence` bucket) |
| Payments | Paystack (Collections + Transfers) |
| Deployment | Docker + Coolify on VPS |

## Architecture Diagram

```
┌────────────────────────────────────────────────────────┐
│                     Cloudflare DNS                     │
│     sellbuysafe.gsgbrands.com.gh → VPS IP              │
│     api.sellbuysafe.gsgbrands.com.gh → VPS IP          │
└──────────┬───────────────────────────┬─────────────────┘
           │                           │
    ┌──────▼──────┐             ┌──────▼──────┐
    │   Frontend  │             │   Backend   │
    │  (Next.js)  │────API────▶│  (Express)  │
    │   :3000     │             │   :4000     │
    └─────────────┘             └──────┬──────┘
                                       │
                    ┌──────────────────┬┴────────────────┐
                    │                  │                  │
             ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
             │   Supabase  │   │    Redis    │   │   Paystack  │
             │ (Auth/DB/   │   │  (BullMQ)  │   │   (Pay/     │
             │  Storage)   │   │   :6379     │   │  Transfer)  │
             └─────────────┘   └─────────────┘   └─────────────┘
```

## Key Design Decisions

### Internal Ledger (not Paystack Split)
Buyer pays once via Paystack. The backend allocates funds into three internal ledger buckets:
- **PRODUCT** — held until delivery confirmed; paid to seller
- **DELIVERY** — held until buyer confirms; paid to rider
- **PLATFORM** — platform revenue (buyer + seller fees)

Payouts are executed via **Paystack Transfers** from the business account, referencing ledger bucket balances. This is fully auditable.

### Security
- **RLS enforced** at database level: buyers see only their transactions, sellers only theirs, admins see all.
- **Service role key** used only by the backend for privileged operations.
- **Anon key** used by the frontend, constrained by RLS.
- **Delivery codes** stored as bcrypt hashes; never exposed in plaintext after generation.
- **Webhook signatures** verified using HMAC-SHA512.
- **Idempotency keys** prevent double payouts.
- **Audit logs** record every sensitive action.

### Reliability
- BullMQ payout worker with exponential backoff (5 retries, starting at 60s).
- Webhook idempotency via audit log deduplication.
- Unique constraints on payout idempotency keys.
- Transactional state transitions.

## Data Flow

1. **Buyer creates transaction** → status = `SUBMITTED`
2. **Buyer pays via Paystack** → webhook fires → status = `PAID`, ledger credited
3. **Seller dispatches** → status = `DISPATCHED`, partial code generated
4. **Buyer confirms delivery** → enters delivery code → status = `DELIVERED_CONFIRMED`
5. **Buyer pays rider** → payout queued via BullMQ → Paystack Transfer
6. **Seller collects payout** → enters both codes → payout queued → status = `COMPLETED`

## File Structure

```
/
├── frontend/          Next.js application
│   ├── src/app/       App Router pages
│   ├── src/components/ UI components
│   └── src/lib/       Auth, API client, constants
├── backend/           Express API + BullMQ worker
│   ├── src/routes/    API route handlers
│   ├── src/services/  Supabase, Paystack, Queue
│   ├── src/middleware/ Auth, error handling, idempotency
│   └── src/utils/     Code generation, helpers
├── supabase/          Database migrations
│   └── migrations/    SQL files (schema, RLS, storage)
├── docs/              Documentation
└── docker-compose.yml Deployment config
```

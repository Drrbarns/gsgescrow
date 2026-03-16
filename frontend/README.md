This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel (monorepo)

This repo has the Next.js app inside the **`frontend`** folder. To fix **404 NOT_FOUND** on Vercel:

1. Open your project on [Vercel](https://vercel.com/dashboard).
2. Go to **Settings** → **General**.
3. Under **Root Directory**, click **Edit**, set it to **`frontend`**, then **Save**.
4. Go to **Deployments** → open the **⋯** on the latest deployment → **Redeploy**.

After redeploying, `gsgescrow.vercel.app` should serve the app. Add your env vars (e.g. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`) in **Settings** → **Environment Variables**.

## Simulation mode (testing without real payments)

To test the full buyer/seller flow without Paystack:

1. **Backend:** In `backend/.env` set `SIMULATION_MODE=true`. Restart the API.
2. **Frontend:** In `frontend/.env.local` set `NEXT_PUBLIC_SIMULATION_MODE=true`. Rebuild or restart dev.

When enabled:

- Buyer Step 1: "Pay" simulates success (no redirect to Paystack); you see the success screen and can go to Hub / Step 2.
- Buyer Step 2: A **Simulation** box shows the delivery code **SIM0000**; use "Fill code" or type it, enter any rider MoMo, then "Confirm & Pay Rider" (no real transfer).
- Seller payout: When the seller collects funds, the payout is marked success without a real Paystack transfer.
- A yellow **Simulation mode** banner appears at the top of the site.

**Turn both off** (or remove the env vars) when you are ready for real payments.

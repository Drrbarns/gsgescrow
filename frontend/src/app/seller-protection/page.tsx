'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ShieldCheck, Scale, Clock, RefreshCw, AlertTriangle } from 'lucide-react';

export default function SellerProtectionPage() {
  const scenarios = [
    {
      q: 'Buyer rejects exact item requested?',
      a: 'Take clear photos before dispatch and keep chat records. Raise a dispute with evidence. Buyer covers return rider fee if rejection is unjustified.',
    },
    {
      q: 'Buyer does not show up?',
      a: 'Upload call logs/SMS/tracking evidence. Admin reviews and may approve rider fee refund if justified.',
    },
    {
      q: 'Rider delivered but buyer changed mind?',
      a: 'Open a dispute with evidence. Admin reviews and can authorize rider fee refund where applicable.',
    },
    {
      q: 'Buyer forgets to confirm?',
      a: 'A 24-hour auto-release window protects seller cash flow after delivery is attempted.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <main className="flex-1">
        <section className="bg-slate-950 text-white py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium border border-white/10 mb-6">
              <ShieldCheck className="h-4 w-4" />
              Seller Protection
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">Licensed and Secure PSPs Protection for Sellers</h1>
            <p className="text-slate-300">
              Buyer payment for product/service is secured with licensed PSPs until delivery is verified. Zero scams. Zero stress.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-16 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border p-6">
              <h3 className="font-bold text-lg mb-2">PSPs Vault</h3>
              <p className="text-sm text-slate-600">Buyer funds go to regulated PSP accounts, never directly to seller or platform, until delivery confirmation.</p>
            </div>
            <div className="rounded-2xl bg-white border p-6">
              <h3 className="font-bold text-lg mb-2">Delivery Verification</h3>
              <p className="text-sm text-slate-600">Delivery and payout are validated through secure transaction codes and activity records before release.</p>
            </div>
            <div className="rounded-2xl bg-white border p-6">
              <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-amber-600" /><h3 className="font-bold text-lg">24-Hour Auto-Release</h3></div>
              <p className="text-sm text-slate-600">If buyer does not raise a dispute within 24 hours after delivery attempt, funds are auto-released.</p>
            </div>
            <div className="rounded-2xl bg-white border p-6">
              <div className="flex items-center gap-2 mb-2"><RefreshCw className="h-4 w-4 text-green-600" /><h3 className="font-bold text-lg">Replacement Policy</h3></div>
              <p className="text-sm text-slate-600">Non-food items may be replaced for genuine issues. Food/services are not eligible for replacement.</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white border p-6">
            <div className="flex items-center gap-2 mb-4"><Scale className="h-4 w-4 text-primary" /><h3 className="font-bold text-lg">What Happens When...</h3></div>
            <div className="grid md:grid-cols-2 gap-4">
              {scenarios.map((s) => (
                <div key={s.q} className="rounded-xl border bg-slate-50 p-4">
                  <p className="font-semibold text-sm mb-2 flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />{s.q}</p>
                  <p className="text-sm text-slate-600">{s.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

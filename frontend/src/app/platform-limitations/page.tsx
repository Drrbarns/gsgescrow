'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Scale, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function PlatformLimitationsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <main className="flex-1">
        <section className="bg-slate-950 text-white py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium border border-white/10 mb-6">
              <Scale className="h-4 w-4" />
              Platform Limitations
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">Dispute & Liability Limits</h1>
            <p className="text-slate-300">By using this platform, you agree to the limits below for dispute handling and potential damages.</p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
          <div className="rounded-2xl bg-white border p-6 sm:p-8 space-y-4">
            <p className="text-slate-700">We pledge to excellent customer experience. By using this platform, you agree to limit your dispute to this platform dispute resolution team.</p>
            <p className="text-slate-700">Any cost/damages associated with dispute resolution outside this platform are borne by the party or parties seeking redress.</p>
            <p className="text-slate-700">Where the platform bears damages, liability never exceeds the platform fee paid for that transaction.</p>
            <p className="text-slate-700">Where buyer or seller bears damages, liability never exceeds the profit value of the item or service in dispute.</p>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5" />
              <p className="text-sm text-amber-800">Do not use this platform if you disagree with these limitations.</p>
            </div>
            <p className="text-sm text-slate-600">See <Link href="/terms" className="underline">Legal</Link> for additional information.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

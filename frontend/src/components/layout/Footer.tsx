import Link from 'next/link';
import { ArrowRight, Shield, Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative border-t border-slate-200 bg-gradient-to-b from-white to-slate-50/80">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="mb-10 rounded-3xl border border-primary/15 bg-gradient-to-r from-primary/10 via-violet-500/10 to-indigo-500/10 p-5 sm:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Trusted Transaction Protection
              </div>
              <h3 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                Ready to buy or sell without scams?
              </h3>
              <p className="mt-1.5 text-sm text-slate-600 sm:text-base">
                Create a protected transaction in minutes and let our escrow flow secure the full deal.
              </p>
            </div>
            <Link
              href="/buyer/step-1"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
            >
              Start Protected Deal <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:pr-6">
            <div className="mb-4 flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-slate-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
                <Shield className="h-4.5 w-4.5" />
              </div>
              Sell-Safe Buy-Safe
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              Secure every online transaction. Buyer funds stay protected until delivery is confirmed.
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              A GSG BRANDS Product
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Platform</h3>
            <nav className="flex flex-col gap-2.5">
              <Link href="/hub" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Transaction Hub</Link>
              <Link href="/tracking" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Track Order</Link>
              <Link href="/calculator" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Fee Calculator</Link>
              <Link href="/reviews" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Reviews</Link>
            </nav>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Get Started</h3>
            <nav className="flex flex-col gap-2.5">
              <Link href="/buyer/step-1" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">I&apos;m a Buyer</Link>
              <Link href="/seller/step-1" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">I&apos;m a Seller</Link>
              <Link href="/seller/dashboard" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Seller Dashboard</Link>
              <Link href="/seller/embed" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Get Your Trust Badge</Link>
            </nav>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Resources</h3>
            <nav className="flex flex-col gap-2.5">
              <Link href="/protection" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Buyer Protection</Link>
              <Link href="/seller-protection" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Seller Protection</Link>
              <Link href="/platform-limitations" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Platform Limitations</Link>
              <Link href="/terms" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Terms of Service</Link>
              <Link href="/terms#privacy" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Privacy Policy</Link>
            </nav>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} GSG BRANDS. All rights reserved.</p>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Escrow-enabled transactions across Ghana
          </div>
        </div>
      </div>
    </footer>
  );
}

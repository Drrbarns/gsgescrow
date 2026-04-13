import Link from 'next/link';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-slate-800 bg-slate-950 text-slate-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(99,102,241,0.20),transparent_45%),radial-gradient(circle_at_95%_100%,rgba(16,185,129,0.14),transparent_40%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-sm sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/20 px-3 py-1 text-xs font-semibold text-primary-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Trusted Transaction Protection
              </div>
              <h3 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                Ready to buy or sell with full protection?
              </h3>
              <p className="mt-1.5 text-sm text-slate-300 sm:text-base">
                Launch a protected transaction in minutes and keep every payment safe until delivery is confirmed.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/buyer/step-1"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
              >
                Start as Buyer <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/seller/step-1"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-white/15"
              >
                Start as Seller <Zap className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:pr-6">
            <div className="mb-4 flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-white">
              <BrandLogo size={36} />
              Sell-Safe Buy-Safe
            </div>
            <p className="text-sm leading-relaxed text-slate-300">
              Secure every online transaction. Buyer funds stay protected until delivery is confirmed.
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              A GSG BRANDS Product
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Platform</h3>
            <nav className="flex flex-col gap-2.5">
              <Link href="/hub" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Transaction Hub</Link>
              <Link href="/tracking" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Track Order</Link>
              <Link href="/calculator" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Fee Calculator</Link>
              <Link href="/reviews" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Reviews</Link>
            </nav>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Get Started</h3>
            <nav className="flex flex-col gap-2.5">
              <Link href="/buyer/step-1" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">I&apos;m a Buyer</Link>
              <Link href="/seller/step-1" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">I&apos;m a Seller</Link>
              <Link href="/seller/dashboard" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Seller Dashboard</Link>
              <Link href="/seller/embed" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Get Your Trust Badge</Link>
            </nav>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Resources</h3>
            <nav className="flex flex-col gap-2.5">
              <Link href="/protection" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Buyer Protection</Link>
              <Link href="/seller-protection" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Seller Protection</Link>
              <Link href="/platform-limitations" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Platform Limitations</Link>
              <Link href="/terms" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Terms of Service</Link>
              <Link href="/terms#privacy" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Privacy Policy</Link>
            </nav>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-800 pt-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} GSG BRANDS. All rights reserved.</p>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Secure transactions across Ghana
          </div>
        </div>
      </div>
    </footer>
  );
}

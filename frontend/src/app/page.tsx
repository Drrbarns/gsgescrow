'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck, Truck, PackageCheck, Banknote,
  ShoppingBag, Store, Copy, Check, MessageCircle,
  Smartphone, Shield, Lock, Zap,
  CheckCircle2, Star, Sparkles
} from 'lucide-react';
import { useState, useEffect, type InputHTMLAttributes } from 'react';
import { api } from '@/lib/api';
import { LiveStats, type StatsData } from '@/components/shared/LiveStats';
import { WhatsAppSupportButton } from '@/components/shared/WhatsAppShare';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const steps = [
  {
    icon: ShieldCheck,
    title: 'Buyer Pays Safely',
    description: 'The buyer makes a secure payment. Funds are held with licensed PSPs (Paystack, Hubtel, Moolre, Flutterwave) so the seller never receives money upfront.',
  },
  {
    icon: Truck,
    title: 'Seller Dispatches',
    description: 'Once payment is confirmed, the seller ships or delivers the item. Unique tracking codes keep both parties informed.',
  },
  {
    icon: PackageCheck,
    title: 'Delivery Confirmed',
    description: 'The buyer inspects the item and confirms delivery using a secure code. For non-food items, replacements can be requested.',
  },
  {
    icon: Banknote,
    title: 'Funds Released',
    description: 'After confirmation, seller payout is released and delivery fees are settled with full traceability.',
  },
];

export default function HomePage() {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sellbuysafe.gsgbrands.com';

  useEffect(() => {
    api.getPlatformStats().then(res => setStats(res.data)).catch(() => {});
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 selection:bg-primary/30">
      <Header />

      <main className="flex-1 overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(109,40,217,0.06),transparent_36%),radial-gradient(circle_at_100%_0%,rgba(37,99,235,0.05),transparent_34%)]">
        {/* HERO SECTION */}
        <section className="relative min-h-[560px] md:min-h-[640px] lg:min-h-[720px] overflow-hidden">
          <Image
            src="/images/hero-woman.png"
            alt="Confident professional using a smartphone"
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/70 to-slate-900/35" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-24 sm:py-28 lg:py-36">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white/90 backdrop-blur">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Licensed PSP-Powered Protection
              </div>

              <h1 className="text-3xl leading-tight sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
                Secure Every Transaction.
                <br />
                Protect Every Deal.
              </h1>

              <p className="mt-5 max-w-2xl text-base sm:text-lg lg:text-xl text-slate-200 leading-relaxed">
                Buy and sell confidently across social media, websites, and digital channels. Funds stay protected until delivery is confirmed.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link href="/buyer/step-1" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full h-12 sm:h-14 px-7 rounded-full text-base gap-2 shadow-xl shadow-primary/30">
                    <ShoppingBag className="h-5 w-5" /> Start as Buyer
                  </Button>
                </Link>
                <Link href="/seller/step-1" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full h-12 sm:h-14 px-7 rounded-full text-base gap-2 border-white/50 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                    <Store className="h-5 w-5" /> Start as Seller
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* LOGO CLOUD / TRUST INDICATORS */}
        <section className="py-10 sm:py-14 bg-white/90 border-y border-slate-200/70 overflow-hidden backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="text-center text-[10px] sm:text-xs font-bold text-slate-400 mb-6 sm:mb-10 uppercase tracking-[0.22em]">Trusted Payment Service Providers (PSPs)</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 items-center justify-items-stretch max-w-5xl mx-auto">
              <div className="flex items-center justify-center gap-2 sm:gap-3 group cursor-pointer rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 sm:py-4 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white border border-slate-100 flex items-center justify-center group-hover:bg-[#FFCC00] group-hover:border-[#FFCC00] transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1">
                  <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 group-hover:text-[#000000] transition-colors duration-300" />
                </div>
                <span className="font-extrabold text-base sm:text-xl text-slate-400 group-hover:text-slate-900 transition-colors duration-300 tracking-tight">MTN MoMo</span>
              </div>

              <div className="flex items-center justify-center gap-2 sm:gap-3 group cursor-pointer rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 sm:py-4 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white border border-slate-100 flex items-center justify-center group-hover:bg-[#E60000] group-hover:border-[#E60000] transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1">
                  <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="font-extrabold text-base sm:text-xl text-slate-400 group-hover:text-slate-900 transition-colors duration-300 tracking-tight">Telecel Cash</span>
              </div>

              <div className="flex items-center justify-center gap-2 sm:gap-3 group cursor-pointer rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 sm:py-4 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white border border-slate-100 flex items-center justify-center group-hover:bg-[#000000] group-hover:border-[#000000] transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1">
                  <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="font-extrabold text-base sm:text-xl text-slate-400 group-hover:text-slate-900 transition-colors duration-300 tracking-tight">AT Money</span>
              </div>

              <div className="flex items-center justify-center gap-2 sm:gap-3 group cursor-pointer rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 sm:py-4 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white border border-slate-100 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1">
                  <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="font-extrabold text-base sm:text-xl text-slate-400 group-hover:text-slate-900 transition-colors duration-300 tracking-tight">ATM Card</span>
              </div>
            </div>
            <p className="text-center text-xs text-slate-500 mt-6">
              Paystack, Moolre, Flutterwave (MTN MoMo, Telecel Cash, AT Money, ATM Cards)
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-16 sm:py-24 lg:py-32 relative overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200/70">
          <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(167,139,250,0.12),transparent_38%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_42%)]" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto text-center mb-12 sm:mb-16"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs sm:text-sm font-semibold text-primary mb-5">
                <Shield className="h-4 w-4 text-primary" /> How It Works
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                Secure Flow, <span className="text-primary">From Payment to Payout</span>
              </h2>
              <p className="text-base sm:text-lg text-slate-600">
                A modern 4-step process built to keep both buyers and sellers protected at every stage.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {steps.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-lg shadow-slate-200/70"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 via-transparent to-blue-100/50" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <step.icon className="h-6 w-6" />
                      </div>
                      <span className="text-4xl sm:text-5xl font-black text-slate-200 leading-none">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{step.description}</p>

                    <div className="mt-5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary via-violet-500 to-blue-500"
                        style={{ width: `${(i + 1) * 25}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* LIVE STATS */}
        <LiveStats stats={stats} />

        {/* WHY CHOOSE US (BENTO GRID) */}
        <section className="py-16 sm:py-24 lg:py-32 bg-slate-100/70">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-10 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-3 sm:mb-4 text-slate-900">Built for the Modern Ghanaian Market</h2>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl">Whether you sell on Instagram or buy from Twitter, we provide the infrastructure to make every deal safe.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="md:col-span-2 rounded-3xl bg-white border border-slate-200 shadow-sm p-8 overflow-hidden relative group hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><ShieldCheck className="h-40 w-40 text-primary" /></div>
                <h3 className="text-2xl font-bold mb-3 relative z-10">Zero Scams. 100% Confidence.</h3>
                <p className="text-muted-foreground max-w-md relative z-10 mb-6">Buyers inspect before funds are released. Sellers know the money is secured before they ship. The ultimate win-win.</p>
                <ul className="space-y-3 relative z-10">
                  {['24-hour auto-release protection', 'Photo/Video/SMS evidence for disputes', 'Instant refunds if seller defaults'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-5 w-5 text-green-500" /> {item}</li>
                  ))}
                </ul>
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="rounded-3xl bg-gradient-to-br from-primary via-purple-700 to-indigo-700 text-white p-8 shadow-lg hover:shadow-2xl hover:shadow-primary/25 transition-all duration-300">
                <Store className="h-10 w-10 mb-4 opacity-80" />
                <h3 className="text-xl font-bold mb-2">For Sellers</h3>
                <p className="text-primary-foreground/80 text-sm mb-6">Build a verified reputation. Get a trust badge for your bio and watch your sales conversion skyrocket.</p>
                <Link href="/seller/embed"><Button variant="secondary" size="sm" className="rounded-full w-full">Get Trust Badge</Button></Link>
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2} className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300">
                <Truck className="h-10 w-10 text-blue-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">Rider Protection</h3>
                <p className="text-muted-foreground text-sm">Delivery fees are secured with PSPs. Rider payout excludes PSP transaction fees and is released on confirmation.</p>
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={3} className="md:col-span-2 rounded-3xl bg-white border border-slate-200 shadow-sm p-8 flex flex-col sm:flex-row items-center gap-8 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-3">Share Anywhere</h3>
                  <p className="text-muted-foreground mb-6">Generate a secure payment link and send it via WhatsApp, Instagram DM, or SMS. It is that easy.</p>
                  <div className="flex items-center gap-2 bg-muted p-2 rounded-xl">
                    <Input value={shareUrl} readOnly className="border-none bg-transparent focus-visible:ring-0" />
                    <Button size="sm" onClick={handleCopy} className="rounded-lg shrink-0 gap-2">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
                    </Button>
                  </div>
                </div>
                <div className="flex gap-4 opacity-50">
                  <MessageCircle className="h-12 w-12" />
                  <Smartphone className="h-12 w-12" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA — dark section with optional background image; overlay keeps text readable */}
        <section
          className="relative overflow-hidden min-h-[320px] flex items-center"
          style={{ backgroundColor: '#0f172a' }}
        >
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0">
              <Image
                src="/images/happy-customer.png"
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
              />
            </div>
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, rgba(15,23,42,0.78) 0%, rgba(15,23,42,0.72) 50%, rgba(15,23,42,0.82) 100%)',
              }}
              aria-hidden
            />
          </div>
          <div className="relative z-10 w-full py-20 sm:py-28 lg:py-36">
            <div className="mx-auto max-w-4xl px-4 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white mb-5">
                <Sparkles className="h-4 w-4" /> Ready to transact safely?
              </div>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold mb-4 sm:mb-6 text-white">Stop Risking Your Money.</h2>
              <p className="text-base sm:text-xl text-slate-200 mb-8 sm:mb-10 max-w-2xl mx-auto">Join the thousands of smart Ghanaians using Sell-Safe Buy-Safe today.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/buyer/step-1"><Button size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-full text-base sm:text-lg shadow-xl shadow-primary/30">Start a Transaction</Button></Link>
                <Link href="/calculator"><Button size="lg" variant="outline" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-full text-base sm:text-lg border-white/50 text-white hover:bg-white/20 hover:text-white bg-white/10">Calculate Fees</Button></Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      <WhatsAppSupportButton />
      <Footer />
    </div>
  );
}

// Simple Input mock since we didn't import it at the top to save space
function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return <input className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />
}

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
  CheckCircle2, Star
} from 'lucide-react';
import { APP_TAGLINE } from '@/lib/constants';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { LiveStats } from '@/components/shared/LiveStats';
import { WhatsAppSupportButton } from '@/components/shared/WhatsAppShare';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const steps = [
  {
    icon: ShieldCheck,
    title: 'Buyer Pays Safely',
    description: 'The buyer makes a secure payment through Paystack. Funds are held in escrow — the seller never receives money upfront.',
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
    description: 'After confirmation, the seller and rider are paid out automatically. Fast, transparent, and dispute-free.',
  },
];

export default function HomePage() {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sellsafe.com';

  useEffect(() => {
    api.getPlatformStats().then(res => setStats(res.data)).catch(() => {});
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/30">
      <Header />

      <main className="flex-1 overflow-hidden">
        {/* HERO SECTION */}
        <section className="relative min-h-[480px] lg:min-h-0 lg:pt-36 lg:pb-40 bg-slate-50">
          {/* Mobile: hero image as full background — z-0 so it stays behind content */}
          <div className="absolute inset-0 z-0 lg:hidden">
            <Image
              src="/images/hero-woman.png"
              alt="Confident African Professional"
              fill
              className="object-cover object-top"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/88 to-white" aria-hidden />
          </div>

          {/* Desktop: abstract gradient blobs */}
          <div className="absolute inset-0 z-0 overflow-hidden hidden lg:block">
            <div className="absolute -top-[40%] -right-[10%] h-[1000px] w-[1000px] rounded-full bg-primary/8 blur-[120px]" />
            <div className="absolute top-[20%] -left-[10%] h-[800px] w-[800px] rounded-full bg-blue-500/8 blur-[120px]" />
            <div className="absolute top-[60%] right-[20%] h-[300px] w-[300px] rounded-full bg-amber-400/6 blur-[100px]" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10 pt-24 pb-16 sm:pt-28 sm:pb-28 lg:pt-0 lg:pb-0">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">

              <div className="max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
                <div className="mb-5 sm:mb-7 inline-flex items-center gap-2 rounded-full border border-primary/30 lg:border-primary/20 bg-white/80 lg:bg-primary/5 backdrop-blur-sm px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-primary shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  Ghana&apos;s #1 Escrow Platform
                </div>

                <h1 className="text-[2rem] leading-[1.1] sm:text-5xl lg:text-[4.25rem] lg:leading-[1.08] font-extrabold tracking-tight mb-5 sm:mb-7 text-slate-900">
                  Secure Every{' '}
                  <span className="relative inline-block">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-primary">Transaction.</span>
                    <span className="absolute -bottom-1 left-0 right-0 h-[3px] sm:h-1 rounded-full bg-gradient-to-r from-primary to-blue-600 opacity-40" />
                  </span>
                  <br/>
                  Protect Every Deal.
                </h1>

                <p className="text-base sm:text-lg lg:text-xl text-slate-600 lg:text-slate-500 mb-7 sm:mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Buy and sell online with <strong className="text-slate-800 lg:text-slate-700">zero risk</strong>. We hold funds securely until the buyer receives and approves the item. No scams, no chargebacks &mdash; just safe business.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                  <Link href="/buyer/step-1" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full h-12 sm:h-14 px-6 sm:px-8 rounded-full text-sm sm:text-base gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5">
                      <ShoppingBag className="h-5 w-5" /> Start as Buyer
                    </Button>
                  </Link>
                  <Link href="/seller/step-1" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="w-full h-12 sm:h-14 px-6 sm:px-8 rounded-full text-sm sm:text-base gap-2 border-2 border-slate-300 lg:border-slate-200 bg-white/70 lg:bg-transparent backdrop-blur-sm hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 hover:-translate-y-0.5">
                      <Store className="h-5 w-5" /> Start as Seller
                    </Button>
                  </Link>
                </div>

                {/* Trust strip */}
                <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-6">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2.5">
                      {['JD', 'AK', 'MO', 'ED', 'KA'].map((initials, i) => (
                        <div
                          key={initials}
                          className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border-[2.5px] border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                          style={{
                            zIndex: 10 - i,
                            background: ['#6d28d9','#2563eb','#059669','#d97706','#dc2626'][i],
                          }}
                        >
                          {initials}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex text-amber-400 mb-0.5">
                        {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 lg:text-slate-600">Trusted by <span className="text-slate-900">10,000+</span> Ghanaians</p>
                    </div>
                  </div>
                  <div className="hidden sm:block h-8 w-px bg-slate-200" />
                  <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-600 lg:text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-green-500" /> Bank-level security</span>
                    <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-amber-500" /> Instant payouts</span>
                  </div>
                </div>
              </div>

              {/* Right Visuals — desktop only */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                className="relative hidden lg:block h-[600px] w-full"
              >
                <div className="absolute inset-0 right-[-10%] top-[5%] bottom-[5%] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-900/20 border border-white/30 z-0">
                  <Image
                    src="/images/hero-woman.png"
                    alt="Confident African Professional using phone"
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/50 via-slate-900/10 to-transparent" />
                </div>

                {/* Main Transaction Card */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                  className="absolute top-[8%] -left-[10%] w-[340px] rounded-3xl border border-white/60 bg-white/95 backdrop-blur-xl shadow-2xl shadow-slate-900/10 p-6 z-20"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-primary via-blue-500 to-primary" />
                  <div className="flex justify-between items-center mb-5 pt-1">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">Escrow Secured</p>
                        <p className="text-xs text-slate-400">Transaction #TX-892A</p>
                      </div>
                    </div>
                    <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-green-200">PAID</span>
                  </div>
                  <div className="space-y-3.5 mb-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">iPhone 15 Pro Max</span>
                      <span className="font-bold text-slate-800">GHS 15,400</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Delivery Fee</span>
                      <span className="font-bold text-slate-800">GHS 50</span>
                    </div>
                    <div className="h-px w-full bg-slate-100" />
                    <div className="flex justify-between text-base font-bold">
                      <span className="text-slate-900">Total Secured</span>
                      <span className="text-primary">GHS 15,450</span>
                    </div>
                  </div>
                  <Button className="w-full rounded-xl gap-2 font-semibold shadow-sm" disabled>
                    <Lock className="h-4 w-4" /> Funds Locked in Escrow
                  </Button>
                </motion.div>

                {/* Delivery Confirmed Notification */}
                <motion.div
                  animate={{ y: [0, 12, 0] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                  className="absolute top-[15%] right-[3%] w-[240px] rounded-2xl border border-white/60 bg-white/95 backdrop-blur-md shadow-xl shadow-slate-900/8 p-4 z-30"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-green-50 flex items-center justify-center text-green-500 border border-green-100">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900">Delivery Confirmed</p>
                      <p className="text-[10px] text-slate-400">Buyer approved item</p>
                    </div>
                  </div>
                </motion.div>

                {/* Payout Notification */}
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 2 }}
                  className="absolute bottom-[18%] left-[3%] w-[260px] rounded-2xl border border-white/60 bg-white/95 backdrop-blur-md shadow-xl shadow-slate-900/8 p-4 z-10"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900">Payout Released</p>
                      <p className="text-[10px] text-slate-400">GHS 15,400 sent to Seller</p>
                    </div>
                  </div>
                </motion.div>

                {/* New: Security Badge */}
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
                  className="absolute bottom-[8%] right-[8%] rounded-full border border-white/60 bg-white/95 backdrop-blur-md shadow-lg shadow-slate-900/8 px-4 py-2.5 z-20"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-amber-50 flex items-center justify-center border border-amber-200">
                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">256-bit Encrypted</span>
                  </div>
                </motion.div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* LOGO CLOUD / TRUST INDICATORS */}
        <section className="py-8 sm:py-12 bg-white border-y border-slate-100 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="text-center text-[10px] sm:text-xs font-bold text-slate-400 mb-6 sm:mb-10 uppercase tracking-[0.2em]">Trusted Payment Partners</p>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-4 sm:gap-12 md:gap-20 items-center justify-items-center">
              <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-[#092E20] group-hover:border-[#092E20] transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="font-extrabold text-base sm:text-xl text-slate-400 group-hover:text-slate-900 transition-colors duration-300 tracking-tight">Paystack</span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-[#FFCC00] group-hover:border-[#FFCC00] transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1">
                  <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 group-hover:text-[#000000] transition-colors duration-300" />
                </div>
                <span className="font-extrabold text-base sm:text-xl text-slate-400 group-hover:text-slate-900 transition-colors duration-300 tracking-tight">MTN MoMo</span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-[#E60000] group-hover:border-[#E60000] transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1">
                  <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="font-extrabold text-base sm:text-xl text-slate-400 group-hover:text-slate-900 transition-colors duration-300 tracking-tight">Telecel Cash</span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-[#000000] group-hover:border-[#000000] transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1">
                  <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="font-extrabold text-base sm:text-xl text-slate-400 group-hover:text-slate-900 transition-colors duration-300 tracking-tight">AT Money</span>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-16 sm:py-24 lg:py-32 relative bg-slate-50 overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[100px]" />
            <div className="absolute bottom-[10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px]" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-1.5 text-sm font-bold text-slate-600 mb-6 shadow-sm"
              >
                <Shield className="h-4 w-4 text-primary" /> How It Works
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-extrabold sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-slate-900 tracking-tight"
              >
                The Safest Way to <span className="text-primary">Transact</span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-base sm:text-xl text-slate-600"
              >
                Four simple steps that guarantee peace of mind for both buyers and sellers.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative">
              {/* Animated connecting line for desktop */}
              <div className="hidden lg:block absolute top-[4.5rem] left-[12%] right-[12%] h-[2px] bg-slate-200 z-0">
                <motion.div 
                  initial={{ width: "0%" }}
                  whileInView={{ width: "100%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-primary via-blue-500 to-primary"
                />
              </div>

              {steps.map((step, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2, duration: 0.6 }}
                  className="relative z-10 flex flex-col"
                >
                  {/* Icon Node */}
                  <div className="mb-8 relative mx-auto lg:mx-0">
                    <div className="h-20 w-20 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 flex items-center justify-center relative z-10 group hover:-translate-y-1 hover:shadow-primary/20 hover:border-primary/30 transition-all duration-300">
                      <step.icon className="h-8 w-8 text-primary" />
                      {/* Step Number Badge */}
                      <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center border-[3px] border-slate-50 shadow-sm">
                        {i + 1}
                      </div>
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className="bg-white rounded-3xl p-8 shadow-lg shadow-slate-200/40 border border-slate-100 flex-1 relative overflow-hidden group hover:border-primary/20 transition-colors duration-300 text-center lg:text-left">
                    {/* Subtle watermark number */}
                    <div className="absolute -right-4 -bottom-4 text-[100px] font-black text-slate-50 group-hover:text-primary/[0.03] transition-colors duration-500 pointer-events-none select-none leading-none">
                      0{i + 1}
                    </div>
                    
                    <h3 className="text-xl font-bold mb-4 text-slate-900 relative z-10">{step.title}</h3>
                    <p className="text-slate-600 leading-relaxed text-sm relative z-10">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* LIVE STATS */}
        <LiveStats stats={stats} />

        {/* WHY CHOOSE US (BENTO GRID) */}
        <section className="py-16 sm:py-24 lg:py-32 bg-muted/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-10 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-3 sm:mb-4 text-slate-900">Built for the Modern Ghanaian Market</h2>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl">Whether you sell on Instagram or buy from Twitter, we provide the infrastructure to make every deal safe.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="md:col-span-2 rounded-3xl bg-card border shadow-sm p-8 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><ShieldCheck className="h-40 w-40 text-primary" /></div>
                <h3 className="text-2xl font-bold mb-3 relative z-10">Zero Scams. 100% Confidence.</h3>
                <p className="text-muted-foreground max-w-md relative z-10 mb-6">Buyers inspect before funds are released. Sellers know the money is secured before they ship. The ultimate win-win.</p>
                <ul className="space-y-3 relative z-10">
                  {['72-hour auto-release protection', 'Photo/Video evidence for disputes', 'Instant refunds if seller defaults'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-5 w-5 text-green-500" /> {item}</li>
                  ))}
                </ul>
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="rounded-3xl bg-gradient-to-br from-primary to-purple-700 text-white p-8 shadow-lg">
                <Store className="h-10 w-10 mb-4 opacity-80" />
                <h3 className="text-xl font-bold mb-2">For Sellers</h3>
                <p className="text-primary-foreground/80 text-sm mb-6">Build a verified reputation. Get a trust badge for your bio and watch your sales conversion skyrocket.</p>
                <Link href="/seller/embed"><Button variant="secondary" size="sm" className="rounded-full w-full">Get Trust Badge</Button></Link>
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2} className="rounded-3xl bg-card border shadow-sm p-8">
                <Truck className="h-10 w-10 text-blue-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">Rider Protection</h3>
                <p className="text-muted-foreground text-sm">Delivery fees are secured in escrow too. Riders get paid instantly upon delivery confirmation.</p>
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={3} className="md:col-span-2 rounded-3xl bg-card border shadow-sm p-8 flex flex-col sm:flex-row items-center gap-8">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-3">Share Anywhere</h3>
                  <p className="text-muted-foreground mb-6">Generate a secure payment link and send it via WhatsApp, Instagram DM, or SMS. It's that easy.</p>
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
                background: 'linear-gradient(to bottom, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.88) 50%, rgba(15,23,42,0.94) 100%)',
              }}
              aria-hidden
            />
          </div>
          <div className="relative z-10 w-full py-20 sm:py-28 lg:py-36">
            <div className="mx-auto max-w-4xl px-4 text-center">
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
function Input({ className, ...props }: any) {
  return <input className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />
}

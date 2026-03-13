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
        <section className="relative pt-24 pb-32 lg:pt-36 lg:pb-40">
          {/* Abstract Background Elements */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-[40%] -right-[10%] h-[1000px] w-[1000px] rounded-full bg-primary/10 blur-[120px] opacity-70" />
            <div className="absolute top-[20%] -left-[10%] h-[800px] w-[800px] rounded-full bg-blue-500/10 blur-[120px] opacity-50" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 relative">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              
              {/* Left Content */}
              <motion.div 
                initial="hidden" animate="visible" variants={staggerContainer}
                className="max-w-2xl text-center lg:text-left mx-auto lg:mx-0"
              >
                <motion.div variants={fadeUp} custom={0} className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Ghana's #1 Escrow Platform
                </motion.div>
                
                <motion.h1 variants={fadeUp} custom={1} className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl mb-6 text-foreground">
                  Secure Every <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Transaction.</span><br/>
                  Protect Every Deal.
                </motion.h1>
                
                <motion.p variants={fadeUp} custom={2} className="text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed">
                  Buy and sell online with zero risk. We hold the funds securely until the buyer receives and approves the item. No scams, no chargebacks, just safe business.
                </motion.p>
                
                <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link href="/buyer/step-1" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full h-14 px-8 rounded-full text-base gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5">
                      <ShoppingBag className="h-5 w-5" /> Start as Buyer
                    </Button>
                  </Link>
                  <Link href="/seller/step-1" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="w-full h-14 px-8 rounded-full text-base gap-2 border-2 hover:bg-muted transition-all hover:-translate-y-0.5">
                      <Store className="h-5 w-5" /> Start as Seller
                    </Button>
                  </Link>
                </motion.div>

                <motion.div variants={fadeUp} custom={4} className="mt-10 flex items-center justify-center lg:justify-start gap-4 text-sm text-muted-foreground font-medium">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold z-${10-i}`}>
                        {['JD', 'AK', 'MO', 'ED'][i-1]}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex text-yellow-500 mb-0.5">
                      {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                    </div>
                    Trusted by 10,000+ Ghanaians
                  </div>
                </motion.div>
              </motion.div>

              {/* Right Visuals (Floating UI Cards + Image) */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                className="relative hidden lg:block h-[600px] w-full"
              >
                {/* Background Professional Image */}
                <div className="absolute inset-0 right-[-10%] top-[5%] bottom-[5%] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white/50 z-0">
                  <Image 
                    src="/images/hero-woman.png" 
                    alt="Confident African Professional using phone" 
                    fill 
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/40 to-transparent"></div>
                </div>

                {/* Main Card */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }} 
                  transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                  className="absolute top-[10%] -left-[10%] w-[340px] rounded-3xl border border-white/40 bg-white/90 backdrop-blur-xl shadow-2xl p-6 z-20"
                >
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Escrow Secured</p>
                        <p className="text-xs text-muted-foreground">Transaction #TX-892A</p>
                      </div>
                    </div>
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full">PAID</span>
                  </div>
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">iPhone 15 Pro Max</span>
                      <span className="font-bold">GHS 15,400</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span className="font-bold">GHS 50</span>
                    </div>
                    <div className="h-px w-full bg-border" />
                    <div className="flex justify-between text-base font-bold">
                      <span>Total Secured</span>
                      <span className="text-primary">GHS 15,450</span>
                    </div>
                  </div>
                  <Button className="w-full rounded-xl gap-2 font-semibold" disabled>
                    <Lock className="h-4 w-4" /> Funds Locked in Escrow
                  </Button>
                </motion.div>

                {/* Floating Card 1 */}
                <motion.div 
                  animate={{ y: [0, 15, 0] }} 
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                  className="absolute top-[15%] right-[5%] w-[240px] rounded-2xl border border-border/50 bg-card/90 backdrop-blur-md shadow-xl p-4 z-30"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs">Delivery Confirmed</p>
                      <p className="text-[10px] text-muted-foreground">Buyer approved item</p>
                    </div>
                  </div>
                </motion.div>

                {/* Floating Card 2 */}
                <motion.div 
                  animate={{ y: [0, -15, 0] }} 
                  transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 2 }}
                  className="absolute bottom-[20%] left-[5%] w-[260px] rounded-2xl border border-border/50 bg-card/90 backdrop-blur-md shadow-xl p-4 z-10"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs">Payout Released</p>
                      <p className="text-[10px] text-muted-foreground">GHS 15,400 sent to Seller</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* LOGO CLOUD / TRUST INDICATORS */}
        <section className="py-12 bg-white border-y border-slate-100 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="text-center text-xs font-bold text-slate-400 mb-10 uppercase tracking-[0.2em]">Trusted Payment Partners</p>
            
            <div className="flex flex-wrap justify-center gap-6 sm:gap-12 md:gap-20 items-center">
              {/* Paystack */}
              <div className="flex items-center gap-3 group cursor-pointer">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-[#092E20] group-hover:border-[#092E20] transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1">
                  <Shield className="h-6 w-6 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="font-extrabold text-xl text-slate-400 group-hover:text-slate-900 transition-colors duration-300 tracking-tight">Paystack</span>
              </div>
              
              {/* MTN MoMo */}
              <div className="flex items-center gap-3 group cursor-pointer">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-[#FFCC00] group-hover:border-[#FFCC00] transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1">
                  <Smartphone className="h-6 w-6 text-slate-400 group-hover:text-[#000000] transition-colors duration-300" />
                </div>
                <span className="font-extrabold text-xl text-slate-400 group-hover:text-slate-900 transition-colors duration-300 tracking-tight">MTN MoMo</span>
              </div>

              {/* Telecel Cash */}
              <div className="flex items-center gap-3 group cursor-pointer">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-[#E60000] group-hover:border-[#E60000] transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1">
                  <Smartphone className="h-6 w-6 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="font-extrabold text-xl text-slate-400 group-hover:text-slate-900 transition-colors duration-300 tracking-tight">Telecel Cash</span>
              </div>

              {/* AT Money */}
              <div className="flex items-center gap-3 group cursor-pointer">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-[#000000] group-hover:border-[#000000] transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1">
                  <Smartphone className="h-6 w-6 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="font-extrabold text-xl text-slate-400 group-hover:text-slate-900 transition-colors duration-300 tracking-tight">AT Money</span>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24 sm:py-32 relative bg-slate-50 overflow-hidden">
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
                className="text-4xl font-extrabold sm:text-5xl mb-6 text-slate-900 tracking-tight"
              >
                The Safest Way to <span className="text-primary">Transact</span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-xl text-slate-600"
              >
                Four simple steps that guarantee peace of mind for both buyers and sellers.
              </motion.p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative">
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
        <section className="py-24 sm:py-32 bg-muted/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-16">
              <h2 className="text-3xl font-extrabold sm:text-4xl mb-4">Built for the Modern Ghanaian Market</h2>
              <p className="text-lg text-muted-foreground max-w-2xl">Whether you sell on Instagram or buy from Twitter, we provide the infrastructure to make every deal safe.</p>
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

        {/* CTA */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5" />
          <div className="mx-auto max-w-4xl px-4 text-center relative z-10">
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-6">Stop Risking Your Money.</h2>
            <p className="text-xl text-muted-foreground mb-10">Join the thousands of smart Ghanaians using Sell-Safe Buy-Safe today.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/buyer/step-1"><Button size="lg" className="w-full sm:w-auto h-14 px-8 rounded-full text-lg shadow-xl">Start a Transaction</Button></Link>
              <Link href="/calculator"><Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-full text-lg bg-background">Calculate Fees</Button></Link>
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

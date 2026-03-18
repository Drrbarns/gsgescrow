'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Shield, Lock, Clock, AlertTriangle, CheckCircle2, RefreshCw,
  Eye, FileText, Banknote, Users, ArrowRight, Phone, ShieldCheck,
  Fingerprint, Scale
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1 } }),
};

export default function ProtectionPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <main className="flex-1">
        {/* Premium Hero Section */}
        <section className="relative overflow-hidden bg-slate-950 pt-16 pb-32 sm:pt-24 sm:pb-48 text-white">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <Image 
              src="/images/protection-handshake.png" 
              alt="Secure Transaction" 
              fill 
              className="object-cover opacity-20 mix-blend-overlay"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent"></div>
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-green-500/20 blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
          </div>

          <div className="relative mx-auto max-w-4xl px-4 text-center z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-green-300 backdrop-blur-md border border-white/10 mb-6"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Bank-Grade Escrow Security</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl mb-4 sm:mb-6"
            >
              How Your Money is <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-primary">Protected</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mx-auto max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed"
            >
              Every cedis you pay is held in a secure, immutable escrow vault until you physically confirm delivery. Zero scams. Zero stress.
            </motion.p>
          </div>
        </section>

        {/* Protection Layers - Floating Grid */}
        <section className="relative z-20 mx-auto max-w-5xl px-4 sm:px-6 -mt-20 sm:-mt-32 pb-12 sm:pb-24">
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Main Feature - Spans 2 columns on desktop */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0} className="md:col-span-2">
              <div className="rounded-xl sm:rounded-2xl lg:rounded-3xl bg-white shadow-2xl shadow-slate-200/50 border border-slate-100 p-5 sm:p-8 lg:p-12 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                  <Lock className="w-64 h-64" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex h-16 w-16 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600">
                    <Lock className="h-8 w-8 sm:h-12 sm:w-12" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">1. The Escrow Vault</h3>
                    <p className="text-slate-600 leading-relaxed text-base sm:text-lg">
                      When you pay through Sell-Safe Buy-Safe, your money goes into a secure, regulated escrow account — <strong className="text-slate-900">never directly to the seller</strong>. The seller cannot access your funds until you explicitly confirm that you received the correct item in good condition.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {[
              {
                icon: Fingerprint,
                title: '2. Delivery Verification',
                desc: 'A unique cryptographic delivery code is generated for every transaction. The seller must provide this code upon delivery, and you verify it in-app. No code = no release.',
                color: 'bg-purple-50 text-purple-600',
              },
              {
                icon: Clock,
                title: '3. 72-Hour Auto-Release',
                desc: 'After delivery is attempted, a 72-hour countdown starts. If you don\'t raise a dispute within this window, funds auto-release. This balances buyer inspection time with seller cash flow.',
                color: 'bg-amber-50 text-amber-600',
              },
              {
                icon: RefreshCw,
                title: '4. Replacement Guarantee',
                desc: 'For non-food items, if what you receive doesn\'t match the listing, you can request a replacement before funds are released. The seller must comply or face a dispute.',
                color: 'bg-green-50 text-green-600',
              },
              {
                icon: Scale,
                title: '5. Evidence-Based Disputes',
                desc: 'If something goes wrong, our specialized admin team reviews photographic and video evidence from both parties. Decisions are based purely on facts, not accusations.',
                color: 'bg-red-50 text-red-600',
              },
            ].map((layer, i) => (
              <motion.div key={layer.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={i + 1}>
                <div className="rounded-xl sm:rounded-2xl lg:rounded-3xl bg-white shadow-xl shadow-slate-200/40 border border-slate-100 p-5 sm:p-8 h-full hover:shadow-2xl transition-shadow duration-300">
                  <div className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl mb-4 sm:mb-6 ${layer.color}`}>
                    <layer.icon className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3">{layer.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{layer.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Common Scenarios - Bento Grid Style */}
        <section className="bg-slate-900 py-12 sm:py-24 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.apply/noise.svg')] opacity-20 mix-blend-overlay"></div>
          
          <div className="mx-auto max-w-5xl px-4 sm:px-6 relative z-10">
            <div className="text-center mb-8 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">What Happens When...</h2>
              <p className="text-slate-400">Clear answers for every possible edge case.</p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { scenario: 'Seller sends wrong item?', answer: 'Request a replacement (non-food) or open a dispute with photo evidence. Funds remain locked.' },
                { scenario: 'Seller doesn\'t ship?', answer: 'After the agreed timeframe, raise a dispute. Admin reviews and issues a full refund.' },
                { scenario: 'Item is damaged?', answer: 'Take photos immediately and open a dispute. Our team reviews evidence from both parties.' },
                { scenario: 'Rider doesn\'t deliver?', answer: 'The no-show policy kicks in. Upload evidence and the admin team investigates within 24 hours.' },
                { scenario: 'I forget to confirm?', answer: 'The 72-hour auto-release countdown protects the seller. Ensure you inspect within this window.' },
                { scenario: 'Seller is a scammer?', answer: 'Your money is NEVER sent directly to the seller. Even if they vanish, your funds are safe in escrow.' },
              ].map((item, i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={i}>
                  <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 h-full backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <p className="font-bold text-sm flex items-start gap-3 mb-3 text-white">
                      <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" /> 
                      {item.scenario}
                    </p>
                    <p className="text-sm text-slate-400 leading-relaxed flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" /> 
                      {item.answer}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 sm:py-24 bg-white">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <div className="inline-flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-primary/10 text-primary mb-6 sm:mb-8">
              <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">Ready to Transact Safely?</h2>
            <p className="text-base sm:text-lg text-slate-600 mb-8 sm:mb-10 leading-relaxed">Join thousands of smart Ghanaians who refuse to risk their money online.</p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/buyer/step-1">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 rounded-xl text-base font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all gap-2">
                  Start as Buyer <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/seller/step-1">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-xl text-base font-bold border-slate-200 hover:bg-slate-50 transition-all gap-2">
                  Start as Seller <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calculator, ArrowRight, Shield, ShoppingBag, Store, Copy, Check, Lock, ArrowDownToLine, Sparkles } from 'lucide-react';
import { WhatsAppShare } from '@/components/shared/WhatsAppShare';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// Animated counter component for premium feel
function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-block"
    >
      {value.toFixed(2)}
    </motion.span>
  );
}

export default function CalculatorPage() {
  const [productTotal, setProductTotal] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [copied, setCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const calc = useMemo(() => {
    const pt = parseFloat(productTotal) || 0;
    const df = parseFloat(deliveryFee) || 0;
    const riderReleaseFee = 1.0;
    const buyerFeePercent = 0.5;
    const sellerFeePercent = 0.75;
    const buyerFee = parseFloat((pt * buyerFeePercent / 100).toFixed(2));
    const sellerFee = parseFloat((pt * sellerFeePercent / 100).toFixed(2));
    const buyerPays = pt + df + riderReleaseFee + buyerFee;
    const sellerReceives = pt - sellerFee - riderReleaseFee;
    const riderReceives = df + riderReleaseFee;

    return { pt, df, riderReleaseFee, buyerFee, sellerFee, buyerPays, sellerReceives: Math.max(0, sellerReceives), riderReceives };
  }, [productTotal, deliveryFee]);

  function handleCopySummary() {
    const text = `Sell-Safe Buy-Safe Fee Summary\n\nProduct Price: GHS ${calc.pt.toFixed(2)}\nDelivery Fee: GHS ${calc.df.toFixed(2)}\n\nBuyer Pays: GHS ${calc.buyerPays.toFixed(2)}\nSeller Receives: GHS ${calc.sellerReceives.toFixed(2)}\nRider Receives: GHS ${calc.riderReceives.toFixed(2)}\n\nStart here: ${window.location.origin}/buyer/step-1`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isMounted) return null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      
      <main className="flex-1">
        {/* Premium Hero Section */}
        <section className="relative overflow-hidden bg-slate-950 pt-16 pb-32 sm:pt-24 sm:pb-48 text-white">
          {/* Abstract Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
            <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px]" />
          </div>

          <div className="relative mx-auto max-w-5xl px-4 text-center z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-blue-200 backdrop-blur-md border border-white/10 mb-6"
            >
              <Sparkles className="h-4 w-4" />
              <span>Transparent Pricing. Zero Hidden Fees.</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl mb-4 sm:mb-6"
            >
              Calculate Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary">Escrow</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mx-auto max-w-2xl text-base sm:text-lg text-slate-300"
            >
              See exactly how much the buyer pays and the seller receives. Our micro-fees ensure your funds are 100% protected until delivery is confirmed.
            </motion.p>
          </div>
        </section>

        {/* Floating Calculator Interface */}
        <section className="relative z-20 mx-auto max-w-5xl px-4 -mt-20 sm:-mt-32 pb-12 sm:pb-24">
          <div className="rounded-xl sm:rounded-2xl lg:rounded-3xl bg-white shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col lg:flex-row">
            
            {/* Left Side: Inputs */}
            <div className="flex-1 p-5 sm:p-8 lg:p-12 lg:border-r border-slate-100">
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Calculator className="h-5 w-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Transaction Details</h2>
              </div>

              <div className="space-y-6 sm:space-y-8">
                {/* Product Price Input */}
                <div className="group relative">
                  <label className="block text-sm font-semibold text-slate-500 mb-2 transition-colors group-focus-within:text-primary">
                    Product / Service Price
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-xl font-medium text-slate-400">GHS</span>
                    <Input
                      type="number" min="0" step="0.01"
                      value={productTotal} 
                      onChange={e => setProductTotal(e.target.value)}
                      placeholder="0.00" 
                      className="h-14 sm:h-16 w-full pl-16 text-xl sm:text-2xl font-bold rounded-xl sm:rounded-2xl bg-slate-50 border-transparent focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Delivery Fee Input */}
                <div className="group relative">
                  <label className="block text-sm font-semibold text-slate-500 mb-2 transition-colors group-focus-within:text-primary">
                    Delivery Fee (Optional)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-xl font-medium text-slate-400">GHS</span>
                    <Input
                      type="number" min="0" step="0.01"
                      value={deliveryFee} 
                      onChange={e => setDeliveryFee(e.target.value)}
                      placeholder="0.00" 
                      className="h-14 sm:h-16 w-full pl-16 text-xl sm:text-2xl font-bold rounded-xl sm:rounded-2xl bg-slate-50 border-transparent focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 sm:mt-10 rounded-xl sm:rounded-2xl bg-amber-50/50 border border-amber-100 p-4 sm:p-5 flex gap-3 sm:gap-4 items-start">
                <div className="mt-0.5 rounded-full bg-amber-100 p-1.5 text-amber-600">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-amber-900">Bank-Grade Security</h4>
                  <p className="text-sm text-amber-700/80 mt-1 leading-relaxed">
                    Funds are held in a secure vault. The seller only receives the money after the buyer confirms they have received the exact item ordered.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side: Dynamic Receipt */}
            <div className="flex-1 bg-slate-50 p-5 sm:p-8 lg:p-12 relative overflow-hidden">
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              
              <div className="relative z-10">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6">Real-time Breakdown</h3>

                {/* Buyer Section */}
                <motion.div 
                  className="rounded-xl sm:rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 mb-4 shadow-sm"
                  initial={false}
                  animate={{ borderColor: calc.pt > 0 ? '#bfdbfe' : '#e2e8f0' }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-slate-900">Buyer Pays</span>
                  </div>
                  
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex justify-between items-center">
                      <span>Item Price</span>
                      <span className="font-medium text-slate-900">GHS <AnimatedNumber value={calc.pt} /></span>
                    </div>
                    {calc.df > 0 && (
                      <div className="flex justify-between items-center">
                        <span>Delivery</span>
                        <span className="font-medium text-slate-900">GHS <AnimatedNumber value={calc.df} /></span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5">Platform Protection <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">0.5%</span></span>
                      <span className="font-medium text-slate-900">GHS <AnimatedNumber value={calc.buyerFee} /></span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Rider Release Fee</span>
                      <span className="font-medium text-slate-900">GHS <AnimatedNumber value={calc.riderReleaseFee} /></span>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between items-end">
                    <span className="font-semibold text-slate-500">Total Payment</span>
                    <span className="text-xl sm:text-2xl font-bold text-blue-600">GHS <AnimatedNumber value={calc.buyerPays} /></span>
                  </div>
                </motion.div>

                {/* Flow Arrow */}
                <div className="flex justify-center -my-2 relative z-20">
                  <div className="bg-slate-50 p-1 rounded-full">
                    <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20">
                      <ArrowDownToLine className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Seller Section */}
                <motion.div 
                  className="rounded-xl sm:rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 mt-4 shadow-sm"
                  initial={false}
                  animate={{ borderColor: calc.pt > 0 ? '#bbf7d0' : '#e2e8f0' }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <Store className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-slate-900">Seller Receives</span>
                  </div>
                  
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex justify-between items-center">
                      <span>Item Price</span>
                      <span className="font-medium text-slate-900">GHS <AnimatedNumber value={calc.pt} /></span>
                    </div>
                    <div className="flex justify-between items-center text-red-500">
                      <span className="flex items-center gap-1.5">Escrow Fee <span className="text-[10px] bg-red-50 px-1.5 py-0.5 rounded text-red-600">0.75%</span></span>
                      <span className="font-medium">- GHS <AnimatedNumber value={calc.sellerFee} /></span>
                    </div>
                    <div className="flex justify-between items-center text-red-500">
                      <span>Rider Release Fee</span>
                      <span className="font-medium">- GHS <AnimatedNumber value={calc.riderReleaseFee} /></span>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between items-end">
                    <span className="font-semibold text-slate-500">Net Payout</span>
                    <span className="text-xl sm:text-2xl font-bold text-green-600">GHS <AnimatedNumber value={calc.sellerReceives} /></span>
                  </div>
                </motion.div>

                {/* Actions */}
                <div className="mt-6 sm:mt-8 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="outline" 
                      onClick={handleCopySummary} 
                      className="flex-1 h-12 rounded-xl border-slate-200 hover:bg-slate-100 hover:text-slate-900 font-medium transition-all"
                    >
                      <AnimatePresence mode="wait">
                        {copied ? (
                          <motion.div key="copied" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex items-center gap-2 text-green-600">
                            <Check className="h-4 w-4" /> Copied!
                          </motion.div>
                        ) : (
                          <motion.div key="copy" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex items-center gap-2">
                            <Copy className="h-4 w-4 text-slate-400" /> Copy Breakdown
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Button>
                    <WhatsAppShare role="seller" className="flex-1 h-12 rounded-xl font-medium" />
                  </div>

                  <Link href="/buyer/step-1" className="block">
                    <Button className="w-full h-14 rounded-xl text-base font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all gap-2 group">
                      Start Secure Transaction 
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>

              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

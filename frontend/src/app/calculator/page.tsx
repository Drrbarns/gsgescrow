'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Copy, Check, Shield } from 'lucide-react';
import Link from 'next/link';

export default function CalculatorPage() {
  const [amount, setAmount] = useState('');
  const [delivery, setDelivery] = useState('');
  const [copied, setCopied] = useState(false);

  const calc = useMemo(() => {
    const pt = parseFloat(amount) || 0;
    const df = parseFloat(delivery) || 0;
    const riderReleaseFee = df > 0 ? 1.0 : 0.0;
    const buyerFee = pt * 0.0035;
    const sellerFee = pt * 0.0065;
    const buyerPays = pt + df + riderReleaseFee + buyerFee;
    const sellerReceives = pt - sellerFee;

    return { 
      pt, df, riderReleaseFee, buyerFee, sellerFee, buyerPays, 
      sellerReceives: Math.max(0, sellerReceives) 
    };
  }, [amount, delivery]);

  function handleCopyQuote() {
    const text = `Sell-Safe Buy-Safe Quote\n\nItem Price: GHS ${calc.pt.toFixed(2)}\nDelivery: GHS ${calc.df.toFixed(2)}\n\nBuyer Pays: GHS ${calc.buyerPays.toFixed(2)}\nSeller Receives: GHS ${calc.sellerReceives.toFixed(2)}\n\nSecure this deal at: ${typeof window !== 'undefined' ? window.location.origin : ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white selection:bg-primary/30">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Transparent pricing.
            <span className="block text-slate-400 mt-1">Zero surprises.</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-500 font-medium">
            Calculate exactly what you pay and what you receive. <br className="hidden sm:block" />
            Industry-leading rates to keep your money perfectly safe.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-start max-w-5xl mx-auto">
          
          {/* Left: Inputs */}
          <div className="lg:col-span-6 space-y-10 sm:space-y-12 lg:mt-4">
            <div>
              <label className="text-xs font-bold tracking-widest uppercase text-slate-400 block mb-4">
                Item / Service Price
              </label>
              <div className="relative group">
                <span className="absolute left-0 top-0 text-2xl sm:text-3xl font-light text-slate-300 group-focus-within:text-primary transition-colors">
                  GHS
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-4xl sm:text-5xl font-bold bg-transparent border-b-[3px] border-slate-100 pb-3 pl-14 sm:pl-20 text-slate-900 placeholder-slate-200 focus:border-primary outline-none transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                {[100, 500, 1000, 5000].map(val => (
                  <button 
                    key={val} 
                    onClick={() => setAmount(val.toString())} 
                    className="px-4 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    + {val}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold tracking-widest uppercase text-slate-400 block mb-4">
                Delivery Fee <span className="font-medium text-slate-300 ml-2">(Optional)</span>
              </label>
              <div className="relative group">
                <span className="absolute left-0 top-0 text-xl sm:text-2xl font-light text-slate-300 group-focus-within:text-primary transition-colors">
                  GHS
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={delivery}
                  onChange={(e) => setDelivery(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-3xl sm:text-4xl font-bold bg-transparent border-b-[3px] border-slate-100 pb-3 pl-12 sm:pl-16 text-slate-900 placeholder-slate-200 focus:border-primary outline-none transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            </div>
            
            <div className="pt-2">
              <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
                <Shield className="h-5 w-5 text-emerald-500 shrink-0" />
                Payments are held securely in escrow until delivery is confirmed.
              </div>
            </div>
          </div>

          {/* Right: Premium Receipt Card */}
          <div className="lg:col-span-6 relative">
            <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-2xl relative overflow-hidden ring-1 ring-white/10">
              
              {/* Soft atmospheric glows */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-primary blur-[80px] opacity-30 mix-blend-screen pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full bg-emerald-500 blur-[80px] opacity-20 mix-blend-screen pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400">
                    Transaction Summary
                  </h3>
                  <button 
                    onClick={handleCopyQuote}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    title="Copy Quote"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                <div className="space-y-4 text-base sm:text-lg">
                  <div className="flex justify-between items-end">
                    <span className="text-slate-300 text-sm sm:text-base">Item Price</span>
                    <span className="font-medium text-white">GHS {calc.pt.toFixed(2)}</span>
                  </div>
                  {calc.df > 0 && (
                    <div className="flex justify-between items-end">
                      <span className="text-slate-300 text-sm sm:text-base">Delivery Fee</span>
                      <span className="font-medium text-white">GHS {calc.df.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="w-full h-px bg-slate-800 my-5" />

                  {/* Buyer side */}
                  <div className="flex justify-between items-end">
                    <span className="text-slate-400 text-sm sm:text-base">Buyer Fee <span className="text-slate-500 text-xs ml-1">(0.35%)</span></span>
                    <span className="font-medium text-slate-300">GHS {calc.buyerFee.toFixed(2)}</span>
                  </div>
                  {calc.riderReleaseFee > 0 && (
                    <div className="flex justify-between items-end mt-3">
                      <span className="text-slate-400 text-sm sm:text-base">Delivery Support</span>
                      <span className="font-medium text-slate-300">GHS {calc.riderReleaseFee.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-end mt-5 pt-5 border-t border-slate-800">
                    <span className="text-lg sm:text-xl text-white font-medium">Buyer Total</span>
                    <span className="text-2xl sm:text-3xl font-bold text-white">GHS {calc.buyerPays.toFixed(2)}</span>
                  </div>

                  {/* Dashed separator */}
                  <div className="w-full h-px bg-transparent border-t-[1.5px] border-dashed border-slate-800 my-7" />

                  {/* Seller side */}
                  <div className="flex justify-between items-end">
                    <span className="text-slate-400 text-sm sm:text-base">Seller Fee <span className="text-slate-500 text-xs ml-1">(0.65%)</span></span>
                    <span className="font-medium text-rose-400">- GHS {calc.sellerFee.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-end mt-5 pt-5 border-t border-slate-800">
                    <span className="text-lg sm:text-xl text-white font-medium">Seller Receives</span>
                    <span className="text-2xl sm:text-3xl font-bold text-emerald-400">GHS {calc.sellerReceives.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-3">
                  <Link href="/buyer/step-1" className="flex items-center justify-center bg-primary hover:bg-primary/90 text-white rounded-xl py-3 font-bold transition-all text-sm shadow-lg shadow-primary/25">
                    Start Buying
                  </Link>
                  <Link href="/seller/step-1" className="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 font-bold transition-all text-sm backdrop-blur-sm border border-white/10">
                    Start Selling
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { SIMULATION_MODE } from '@/lib/constants';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Banknote, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function SellerStep2() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [deliveryCode, setDeliveryCode] = useState('');
  const [partialCode, setPartialCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ amount: number } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchTransactions() {
    try {
      const { data } = await api.listTransactions({ status: 'DELIVERED_CONFIRMED' });
      setTransactions(data);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  }

  function calcNetPayout(txn: any) {
    return Number(txn.product_total) - Number(txn.seller_platform_fee);
  }

  async function handleCollect() {
    if (!deliveryCode || deliveryCode.length !== 7) { toast.error('Enter valid 7-char delivery code'); return; }
    if (!partialCode || partialCode.length !== 4) { toast.error('Enter valid 4-char partial code'); return; }

    setSubmitting(true);
    try {
      const { data } = await api.paySeller({
        transaction_id: selected.id,
        delivery_code: deliveryCode,
        partial_code: partialCode,
      });
      setSuccess({ amount: data.amount || calcNetPayout(selected) });
      toast.success('Payout initiated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  if (success) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg"
          >
            <div className="rounded-xl sm:rounded-[2rem] bg-white shadow-2xl shadow-green-500/10 border border-green-100 overflow-hidden text-center max-w-full">
              <div className="bg-green-500 py-8 px-6 sm:py-12 sm:px-8 text-white">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                  className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg"
                >
                  <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-green-500" />
                </motion.div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Payout Initiated!</h2>
                <p className="text-green-100 font-medium text-sm sm:text-base max-w-sm mx-auto">
                  GHS {success.amount.toFixed(2)} is being processed to your MoMo account.
                </p>
              </div>
              
              <div className="p-6 sm:p-10">
                <Button onClick={() => router.push('/hub')} className="w-full h-14 rounded-xl text-base font-bold shadow-lg shadow-primary/25">
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Header />
      
      <main className="flex-1 pb-16 sm:pb-24">
        {/* Intro Section */}
        <div className="border-b border-slate-200/80 bg-white">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Step 2 of 2</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Collect Your Payout</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              Enter both your partial code and the buyer's delivery code to verify and release your funds.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 pt-8 sm:pt-10">
          <AnimatePresence mode="wait">
            {!selected ? (
              <motion.div 
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {transactions.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 mb-4">
                      <Banknote className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No pending payouts</h3>
                    <p className="mt-2 text-sm text-slate-500">You don't have any confirmed deliveries awaiting payout.</p>
                    <Button variant="outline" onClick={() => router.push('/hub')} className="mt-6 rounded-xl">Go to Dashboard</Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {transactions.map((txn, idx) => (
                      <motion.div 
                        key={txn.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => setSelected(txn)}
                        className="group rounded-2xl bg-white shadow-sm border border-slate-200/90 p-5 sm:p-6 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-full overflow-hidden"
                      >
                        <div className="flex items-start gap-5">
                          <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 group-hover:bg-emerald-100 transition-colors">
                            <Banknote className="h-7 w-7" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-lg sm:text-xl mb-1">{txn.product_name}</h3>
                            <p className="text-sm text-slate-500 font-medium">
                              <span className="font-mono">{txn.short_id}</span> &middot; Buyer: <span className="text-slate-700">{txn.buyer_name}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-xl border sm:border-none border-slate-100">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Net Payout</p>
                          <p className="text-xl sm:text-2xl font-black text-emerald-600">GHS {calcNetPayout(txn).toFixed(2)}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <Button variant="ghost" onClick={() => setSelected(null)} className="gap-2 text-slate-500 hover:text-slate-900 -ml-4">
                  <ArrowLeft className="h-4 w-4" /> Back to Orders
                </Button>

                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                  
                  {/* Order Summary Header */}
                  <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-5 sm:px-8 sm:py-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1.5">{selected.product_name}</h2>
                    <p className="text-slate-500 font-medium text-sm">
                      <span className="font-mono">{selected.short_id}</span> &middot; Buyer: <span className="text-slate-700">{selected.buyer_name} ({selected.buyer_phone})</span>
                    </p>
                  </div>

                  {/* Form Content */}
                  <div className="p-5 sm:p-8 space-y-8">
                    
                    {/* Financial Summary */}
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 sm:p-6 space-y-3">
                      <div className="flex justify-between items-center text-sm sm:text-base font-medium text-slate-600">
                        <span>Product Total</span>
                        <span className="text-slate-900">GHS {Number(selected.product_total).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm sm:text-base font-medium text-slate-600">
                        <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-500" /> Platform Fee (0.65%)</span>
                        <span className="text-blue-700">- GHS {Number(selected.seller_platform_fee).toFixed(2)}</span>
                      </div>
                      <Separator className="my-4 border-slate-200" />
                      <div className="flex justify-between items-center font-black text-lg sm:text-xl">
                        <span className="text-slate-900">Net Payout</span>
                        <span className="text-emerald-600">GHS {calcNetPayout(selected).toFixed(2)}</span>
                      </div>
                    </div>

                    {SIMULATION_MODE && (
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="font-medium text-amber-800">
                          Simulation: use delivery code <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold mx-1">SIM0000</code> and partial code <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold mx-1">SIM0</code>
                        </p>
                        <Button type="button" variant="outline" size="sm" className="h-9 rounded-lg bg-white shrink-0" onClick={() => { setDeliveryCode('SIM0000'); setPartialCode('SIM0'); }}>Fill codes</Button>
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">Delivery Code (7 characters from buyer) *</Label>
                        <Input 
                          value={deliveryCode} 
                          onChange={e => setDeliveryCode(e.target.value.toUpperCase())} 
                          maxLength={7} 
                          placeholder={SIMULATION_MODE ? 'SIM0000' : 'ABC1234'} 
                          className="h-14 sm:h-16 font-mono text-xl sm:text-2xl tracking-[0.2em] sm:tracking-[0.3em] rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white text-center uppercase font-bold" 
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">Partial Code (4 characters from dispatch) *</Label>
                        <Input 
                          value={partialCode} 
                          onChange={e => setPartialCode(e.target.value.toUpperCase())} 
                          maxLength={4} 
                          placeholder={SIMULATION_MODE ? 'SIM0' : 'AB12'} 
                          className="h-14 sm:h-16 font-mono text-xl sm:text-2xl tracking-[0.2em] sm:tracking-[0.3em] rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white text-center uppercase font-bold" 
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={handleCollect} 
                      disabled={submitting || !deliveryCode || !partialCode} 
                      className="w-full h-14 sm:h-16 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98]"
                    >
                      {submitting ? <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Processing Payout...</> : `Collect GHS ${calcNetPayout(selected).toFixed(2)}`}
                    </Button>

                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
}

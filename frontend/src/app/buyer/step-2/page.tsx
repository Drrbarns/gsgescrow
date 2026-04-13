'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { TRANSACTION_STATUSES, SIMULATION_MODE } from '@/lib/constants';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, Truck, RefreshCw, CheckCircle2, ShieldCheck, MapPin, Package } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function BuyerStep2() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryCode, setDeliveryCode] = useState('');
  const [riderMomo, setRiderMomo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [simDeliveryCode, setSimDeliveryCode] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (SIMULATION_MODE && selected?.id) {
      api.getSimulationDeliveryCode(selected.id).then(({ data }) => setSimDeliveryCode(data.delivery_code)).catch(() => setSimDeliveryCode(null));
    } else {
      setSimDeliveryCode(null);
    }
  }, [selected?.id]);

  async function fetchTransactions() {
    try {
      const { data } = await api.listTransactions({ status: 'DISPATCHED' });
      const { data: data2 } = await api.listTransactions({ status: 'IN_TRANSIT' });
      const { data: data3 } = await api.listTransactions({ status: 'DELIVERED_PENDING' });
      setTransactions([...data, ...data2, ...data3]);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }

  async function handlePayRider() {
    if (!deliveryCode || deliveryCode.length !== 7) { toast.error('Enter a valid 7-character delivery code'); return; }
    if (!riderMomo) { toast.error('Enter rider MoMo number'); return; }

    setSubmitting(true);
    try {
      await api.payRider({ transaction_id: selected.id, rider_momo_number: riderMomo, delivery_code: deliveryCode });
      setSuccess(true);
      toast.success('Rider payment initiated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to pay rider');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestReplacement() {
    if (selected.product_type === 'food') { toast.error('Food items cannot be replaced'); return; }
    setSubmitting(true);
    try {
      await api.requestReplacement(selected.id);
      toast.success('Replacement requested');
      router.push('/buyer/step-3');
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
            <div className="rounded-2xl sm:rounded-[2rem] bg-white shadow-2xl shadow-green-500/10 border border-green-100 overflow-hidden text-center">
              <div className="bg-green-500 py-8 px-6 sm:py-12 sm:px-8 text-white">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                  className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg"
                >
                  <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-green-500" />
                </motion.div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Rider Payment Sent!</h2>
                <p className="text-green-100 font-medium text-sm sm:text-base max-w-sm mx-auto">The rider payout has been queued and will be processed shortly.</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Step 2 of 3</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Confirm Delivery & Pay Rider</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              Select your dispatched order, inspect the item, and use your secure code to release funds to the rider.
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
                      <Package className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No dispatched orders</h3>
                    <p className="mt-2 text-sm text-slate-500">You don't have any orders currently in transit.</p>
                    <Button variant="outline" onClick={() => router.push('/hub')} className="mt-6 rounded-xl">Go to Dashboard</Button>
                  </div>
                ) : (
                  transactions.map((txn, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={txn.id}
                      onClick={() => setSelected(txn)}
                      className="group cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                            <Truck className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900 text-base">{txn.product_name}</p>
                            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                              <span className="font-mono font-medium">{txn.short_id}</span>
                              <span>&middot;</span>
                              <span className="font-semibold text-slate-700">GHS {Number(txn.grand_total).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className={`${TRANSACTION_STATUSES[txn.status]?.color} shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider`}>
                          {TRANSACTION_STATUSES[txn.status]?.label}
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="detail"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <Button variant="ghost" onClick={() => { setSelected(null); setDeliveryCode(''); setRiderMomo(''); }} className="gap-2 -ml-4 text-slate-500 hover:text-slate-900">
                  <ArrowLeft className="h-4 w-4" /> Back to orders
                </Button>

                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-5 sm:px-8 sm:py-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{selected.product_name}</h2>
                        <p className="mt-1.5 text-sm text-slate-500 font-medium flex items-center gap-2">
                          <span className="font-mono">{selected.short_id}</span>
                          <span>&middot;</span>
                          <span>Seller: <span className="text-slate-700">{selected.seller_name}</span></span>
                        </p>
                      </div>
                      <Badge className={`${TRANSACTION_STATUSES[selected.status]?.color} rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider`}>
                        {TRANSACTION_STATUSES[selected.status]?.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-5 sm:p-8 space-y-8">
                    {/* Order Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Product Total</p>
                        <p className="font-bold text-slate-900 text-lg">GHS {Number(selected.product_total).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Delivery Fee</p>
                        <p className="font-bold text-slate-900 text-lg">GHS {Number(selected.delivery_fee).toFixed(2)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Rider Details</p>
                        <p className="font-bold text-slate-900 text-base truncate">{selected.rider_name || 'Assigned Rider'} <span className="text-slate-500 font-normal">({selected.rider_phone || 'Pending'})</span></p>
                      </div>
                    </div>

                    {selected.product_type === 'non_food' && (
                      <div className="space-y-4">
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-slate-400 font-bold tracking-wider">Issue with item?</span></div>
                        </div>
                        <Button variant="outline" onClick={handleRequestReplacement} disabled={submitting} className="w-full gap-2 rounded-xl h-12 sm:h-14 text-sm sm:text-base font-semibold border-slate-200 hover:bg-slate-50">
                          <RefreshCw className="h-4 w-4 text-slate-400" /> Request Replacement
                        </Button>
                      </div>
                    )}

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-slate-400 font-bold tracking-wider">Confirm & Pay</span></div>
                    </div>

                    {/* Payment Form */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg">Release Funds</h3>
                          <p className="text-sm text-slate-500">Only do this after inspecting your item.</p>
                        </div>
                      </div>

                      {SIMULATION_MODE && simDeliveryCode && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm flex items-center justify-between">
                          <p className="font-medium text-amber-800">Simulation Mode: <code className="bg-amber-100 px-2 py-1 rounded font-mono font-bold ml-1">{simDeliveryCode}</code></p>
                          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg bg-white" onClick={() => setDeliveryCode(simDeliveryCode)}>Use Code</Button>
                        </div>
                      )}

                      <div className="space-y-5">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-slate-700">Delivery Code (7 characters) *</Label>
                          <Input 
                            value={deliveryCode} 
                            onChange={e => setDeliveryCode(e.target.value.toUpperCase())} 
                            maxLength={7} 
                            placeholder={SIMULATION_MODE ? 'SIM0000' : 'ABC1234'} 
                            className="h-14 font-mono text-lg tracking-[0.2em] rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white text-center uppercase" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-slate-700">Rider MoMo Number *</Label>
                          <Input 
                            value={riderMomo} 
                            onChange={e => setRiderMomo(e.target.value)} 
                            placeholder="024XXXXXXX" 
                            className="h-14 rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white text-lg" 
                          />
                        </div>
                      </div>

                      <div className="rounded-xl bg-primary/[0.03] border border-primary/10 p-4 text-center">
                        <p className="text-sm text-slate-600">Rider will receive</p>
                        <p className="text-2xl font-black text-primary mt-1">GHS {(Number(selected.delivery_fee) + Number(selected.rider_release_fee)).toFixed(2)}</p>
                      </div>

                      <Button 
                        onClick={handlePayRider} 
                        disabled={submitting || !deliveryCode || !riderMomo} 
                        size="lg" 
                        className="w-full rounded-xl h-14 text-base font-bold shadow-lg shadow-primary/20"
                      >
                        {submitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</> : 'Confirm Delivery & Pay Rider'}
                      </Button>
                    </div>
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

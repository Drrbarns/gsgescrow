'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { MOMO_PROVIDERS } from '@/lib/constants';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, AlertTriangle, Package, CheckCircle2, Store, Truck, Banknote, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

type SellerDispatchTransaction = {
  id: string;
  short_id: string;
  product_name: string;
  buyer_name: string;
  buyer_phone: string;
  product_total: number;
  delivery_address: string;
  delivery_date?: string;
  product_type: 'food' | 'non_food';
};

export default function SellerStep1() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<SellerDispatchTransaction[]>([]);
  const [selected, setSelected] = useState<SellerDispatchTransaction | null>(null);
  const [loading, setLoading] = useState(true);

  const [businessLocation, setBusinessLocation] = useState('');
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [riderTelco, setRiderTelco] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [momoProvider, setMomoProvider] = useState('');
  const [momoName, setMomoName] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [partialCode, setPartialCode] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user]);

  async function fetchTransactions() {
    try {
      const { data } = await api.listTransactions({ status: 'PAID' });
      setTransactions(data);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  const sellerFee = selected ? Number((selected.product_total * 0.65 / 100).toFixed(2)) : 0;

  async function handleDispatch() {
    if (!businessLocation || !riderName || !riderPhone || !riderTelco || !pickupAddress) {
      toast.error('Please fill all required fields'); return;
    }
    if (!momoProvider || !momoNumber || !momoName) { toast.error('Please provide payout destination'); return; }

    if (!selected) { toast.error('No transaction selected'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.dispatchTransaction(selected.id, {
        transaction_id: selected.id,
        seller_business_location: businessLocation,
        rider_name: riderName,
        rider_phone: riderPhone,
        rider_telco: riderTelco,
        pickup_address: pickupAddress,
        additional_info: additionalInfo || undefined,
        seller_payout_destination: {
          type: 'mobile_money',
          name: momoName,
          account_number: momoNumber,
          bank_code: momoProvider,
        },
      });
      setPartialCode(data.partial_code);
      toast.success('Dispatch confirmed!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to dispatch');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  if (partialCode) {
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
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Dispatch Confirmed!</h2>
                <p className="text-green-100 font-medium text-sm sm:text-base max-w-sm mx-auto">Your partial code has been generated securely.</p>
              </div>
              
              <div className="p-6 sm:p-10">
                <div className="mb-8 sm:mb-10">
                  <p className="text-sm text-slate-500 uppercase tracking-wider font-bold mb-3">Your Partial Code</p>
                  <div className="inline-flex items-center justify-center w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-6 sm:px-6 sm:py-8 overflow-hidden shadow-inner">
                    <span className="font-mono text-4xl sm:text-5xl tracking-[0.2em] sm:tracking-[0.3em] font-black text-slate-900">{partialCode}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6 text-left mb-8 sm:mb-10">
                  <div className="flex items-start gap-4">
                    <div className="bg-amber-100 p-3 rounded-xl text-amber-600 shrink-0">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-amber-900 mb-2 text-lg">Keep This Code Safe!</p>
                      <p className="text-sm text-amber-800/80 leading-relaxed font-medium">
                        You will need both this Partial Code AND the Delivery Code (from the buyer) to collect your payout. <strong className="text-amber-900">Do NOT share this code</strong> with anyone.
                      </p>
                    </div>
                  </div>
                </div>

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
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Step 1 of 2</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Accept & Dispatch Order</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              Select a paid order, fill in dispatch details, and confirm to generate your partial payout code.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 pt-8 sm:pt-10">
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
                    <h3 className="text-lg font-bold text-slate-900">No pending orders</h3>
                    <p className="mt-2 text-sm text-slate-500">You do not have any paid orders waiting to be dispatched right now.</p>
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
                          <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:bg-blue-100 transition-colors">
                            <Package className="h-7 w-7" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1.5">
                              <h3 className="font-bold text-slate-900 text-lg sm:text-xl">{txn.product_name}</h3>
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 font-bold px-2.5 py-0.5 text-[10px]">PAID</Badge>
                            </div>
                            <p className="text-sm text-slate-500 font-medium">
                              <span className="font-mono">{txn.short_id}</span> &middot; Buyer: <span className="text-slate-700">{txn.buyer_name}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-xl border sm:border-none border-slate-100">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Product Total</p>
                          <p className="text-xl sm:text-2xl font-black text-slate-900">GHS {Number(txn.product_total).toFixed(2)}</p>
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1.5">{selected.product_name}</h2>
                        <p className="text-slate-500 font-medium text-sm">
                          <span className="font-mono">{selected.short_id}</span> &middot; Buyer: <span className="text-slate-700">{selected.buyer_name} ({selected.buyer_phone})</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Product Total</p>
                        <p className="text-2xl font-black text-primary">GHS {Number(selected.product_total).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div>
                        <span className="text-slate-400 block mb-1.5 text-[10px] uppercase font-bold tracking-wider">Delivery Address</span>
                        <p className="font-bold text-slate-900 line-clamp-2">{selected.delivery_address}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1.5 text-[10px] uppercase font-bold tracking-wider">Delivery Date</span>
                        <p className="font-bold text-slate-900">{selected.delivery_date || 'Flexible'}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-400 block mb-1.5 text-[10px] uppercase font-bold tracking-wider">Type</span>
                        <p className="font-bold text-slate-900">{selected.product_type === 'food' ? 'Food/Services (No Replacement)' : 'Non-Food Item (Replacement Eligible)'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Form Content */}
                  <div className="p-5 sm:p-8 space-y-10">
                    
                    {/* Section: Seller Info */}
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100">
                        <Store className="h-5 w-5 text-primary" /> Seller Details
                      </h3>
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">Your Business Location *</Label>
                        <Input value={businessLocation} onChange={e => setBusinessLocation(e.target.value)} placeholder="Where are you operating from?" className="h-12 sm:h-14 rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white text-base" />
                      </div>
                    </div>

                    {/* Section: Rider Info */}
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100">
                        <Truck className="h-5 w-5 text-primary" /> Dispatch / Rider Details
                      </h3>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-slate-700">Rider Name *</Label>
                          <Input value={riderName} onChange={e => setRiderName(e.target.value)} className="h-12 sm:h-14 rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white text-base" />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-slate-700">Rider Phone (Calls/SMS) *</Label>
                          <Input value={riderPhone} onChange={e => setRiderPhone(e.target.value)} placeholder="024XXXXXXX" className="h-12 sm:h-14 rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white text-base" />
                          <p className="text-xs text-slate-500 font-medium">This can be different from the rider payout MoMo number.</p>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-slate-700">Rider Telco *</Label>
                          <Select value={riderTelco} onValueChange={v => setRiderTelco(v || '')}>
                            <SelectTrigger className="h-12 sm:h-14 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-base"><SelectValue placeholder="Select telco" /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {MOMO_PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-slate-700">Pickup Address *</Label>
                          <Input value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} className="h-12 sm:h-14 rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white text-base" />
                        </div>
                        <div className="space-y-3 sm:col-span-2">
                          <Label className="text-sm font-semibold text-slate-700">Additional Info (Optional)</Label>
                          <Textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} placeholder="Any special instructions for the buyer or rider..." className="min-h-[120px] rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white resize-none text-base p-4" />
                        </div>
                      </div>
                    </div>

                    {/* Section: Payout Info */}
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100">
                        <Banknote className="h-5 w-5 text-primary" /> Your Payout Destination
                      </h3>
                      <div className="grid gap-5 sm:grid-cols-2 mb-8">
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-slate-700">MoMo Provider *</Label>
                          <Select value={momoProvider} onValueChange={v => setMomoProvider(v ?? '')}>
                            <SelectTrigger className="h-12 sm:h-14 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-base"><SelectValue placeholder="Select provider" /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {MOMO_PROVIDERS.map(p => <SelectItem key={p.value} value={p.bank_code}>{p.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-slate-700">Name On MOMO Number *</Label>
                          <Input value={momoName} onChange={e => setMomoName(e.target.value)} placeholder="Exact account name" className="h-12 sm:h-14 rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white text-base" />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-slate-700">MOMO Number *</Label>
                          <Input value={momoNumber} onChange={e => setMomoNumber(e.target.value)} placeholder="024XXXXXXX" className="h-12 sm:h-14 rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white text-base" />
                        </div>
                      </div>

                      <div className="rounded-2xl bg-blue-50/80 border border-blue-100 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-100 p-2.5 rounded-xl shrink-0">
                            <ShieldCheck className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-bold text-blue-900 text-base">Seller Platform Fee</p>
                            <p className="text-sm text-blue-700 font-medium">0.65% of product total</p>
                          </div>
                        </div>
                        <span className="font-black text-2xl text-blue-900">- GHS {sellerFee.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button 
                      onClick={handleDispatch} 
                      disabled={submitting} 
                      className="w-full h-14 sm:h-16 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98]"
                    >
                      {submitting ? <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Confirming Dispatch...</> : 'Confirm Dispatch & Get Code'}
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

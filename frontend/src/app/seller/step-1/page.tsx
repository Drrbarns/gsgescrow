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
              <div className="bg-green-500 py-6 px-4 sm:py-10 sm:px-6 text-white">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                  className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg"
                >
                  <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
                </motion.div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Dispatch Confirmed!</h2>
                <p className="text-green-100 font-medium text-sm sm:text-base">Your partial code has been generated securely.</p>
              </div>
              
              <div className="p-4 sm:p-8">
                <div className="mb-6 sm:mb-8">
                  <p className="text-sm text-slate-500 uppercase tracking-wider font-bold mb-2">Your Partial Code</p>
                  <div className="inline-flex items-center justify-center w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-4 sm:px-4 sm:py-6 overflow-hidden">
                    <span className="font-mono text-2xl sm:text-4xl tracking-[0.2em] sm:tracking-[0.3em] font-extrabold text-slate-900">{partialCode}</span>
                  </div>
                </div>

                <div className="rounded-xl sm:rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 text-left mb-6 sm:mb-8">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="bg-amber-100 p-2 rounded-full text-amber-600 shrink-0 mt-0.5">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-amber-900 mb-1">Keep This Code Safe!</p>
                      <p className="text-sm text-amber-800/80 leading-relaxed">
                        You will need both this Partial Code AND the Delivery Code (from the buyer) to collect your payout. <strong className="text-amber-900">Do NOT share this code</strong> with anyone.
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={() => router.push('/hub')} className="w-full h-12 sm:h-14 rounded-xl text-base font-bold shadow-lg shadow-primary/25">
                  Go to Dashboard
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
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      
      <main className="flex-1 pb-24">
        {/* Header Section */}
        <div className="bg-slate-950 pt-8 pb-24 sm:pt-12 sm:pb-32 text-white px-4">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-primary text-white font-bold text-base sm:text-xl shadow-lg shadow-primary/30 shrink-0">
                1
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">Accept & Dispatch Order</h1>
                <p className="text-slate-400 mt-1 text-sm sm:text-base">Select a paid order, fill in dispatch details, and confirm.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="mx-auto max-w-4xl px-4 -mt-20 relative z-10">
          
          <AnimatePresence mode="wait">
            {!selected ? (
              <motion.div 
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                {transactions.length === 0 ? (
                  <div className="rounded-xl sm:rounded-3xl bg-white shadow-xl border border-slate-100 p-8 sm:p-16 text-center">
                    <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                      <Package className="h-8 w-8 sm:h-10 sm:w-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">No pending orders</h3>
                    <p className="text-slate-500 max-w-md mx-auto text-sm sm:text-base">
                      You do not have any paid orders waiting to be dispatched right now.
                    </p>
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
                        className="group rounded-xl sm:rounded-2xl bg-white shadow-sm border border-slate-200 p-4 sm:p-6 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 max-w-full overflow-hidden"
                      >
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                            <Package className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-bold text-slate-900 text-lg">{txn.product_name}</h3>
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 font-semibold">PAID</Badge>
                            </div>
                            <p className="text-sm text-slate-500">
                              <span className="font-mono">{txn.short_id}</span> &middot; Buyer: <span className="font-medium text-slate-700">{txn.buyer_name}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Product Total</p>
                          <p className="text-lg sm:text-xl font-extrabold text-slate-900">GHS {Number(txn.product_total).toFixed(2)}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Button variant="ghost" onClick={() => setSelected(null)} className="gap-2 text-slate-500 hover:text-slate-900 -ml-4">
                  <ArrowLeft className="h-4 w-4" /> Back to Orders
                </Button>

                <div className="rounded-xl sm:rounded-3xl bg-white shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden max-w-full">
                  
                  {/* Order Summary Header */}
                  <div className="bg-slate-50 border-b border-slate-100 p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">{selected.product_name}</h2>
                        <p className="text-slate-500 font-medium">
                          <span className="font-mono">{selected.short_id}</span> &middot; Buyer: {selected.buyer_name} ({selected.buyer_phone})
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Product Total</p>
                        <p className="text-xl sm:text-2xl font-extrabold text-primary">GHS {Number(selected.product_total).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm bg-white p-3 sm:p-4 rounded-xl border border-slate-200 overflow-hidden">
                      <div>
                        <span className="text-slate-400 block mb-1 text-xs uppercase font-bold">Delivery Address</span>
                        <p className="font-medium text-slate-900 line-clamp-2">{selected.delivery_address}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1 text-xs uppercase font-bold">Delivery Date</span>
                        <p className="font-medium text-slate-900">{selected.delivery_date || 'Flexible'}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-400 block mb-1 text-xs uppercase font-bold">Type</span>
                        <p className="font-medium text-slate-900">{selected.product_type === 'food' ? 'Food/Services (No Replacement)' : 'Non-Food Item (Replacement Eligible)'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Form Content */}
                  <div className="p-4 sm:p-8 space-y-8 sm:space-y-10">
                    
                    {/* Section: Seller Info */}
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-5 pb-2 border-b border-slate-100">
                        <Store className="h-5 w-5 text-primary" /> Seller Details
                      </h3>
                      <div className="space-y-2">
                        <Label className="text-slate-600 font-semibold">Your Business Location *</Label>
                        <Input value={businessLocation} onChange={e => setBusinessLocation(e.target.value)} placeholder="Where are you operating from?" className="h-12 sm:h-14 rounded-xl bg-slate-50 border-slate-200" />
                      </div>
                    </div>

                    {/* Section: Rider Info */}
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-5 pb-2 border-b border-slate-100">
                        <Truck className="h-5 w-5 text-primary" /> Dispatch / Rider Details
                      </h3>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-slate-600 font-semibold">Rider Name *</Label>
                          <Input value={riderName} onChange={e => setRiderName(e.target.value)} className="h-12 sm:h-14 rounded-xl bg-slate-50 border-slate-200" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-600 font-semibold">Rider Phone (Calls/SMS) *</Label>
                          <Input value={riderPhone} onChange={e => setRiderPhone(e.target.value)} placeholder="024XXXXXXX" className="h-12 sm:h-14 rounded-xl bg-slate-50 border-slate-200" />
                          <p className="text-xs text-slate-500">This can be different from the rider payout MoMo number entered at delivery confirmation.</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-600 font-semibold">Rider Telco *</Label>
                          <Select value={riderTelco} onValueChange={v => setRiderTelco(v || '')}>
                            <SelectTrigger className="h-12 sm:h-14 rounded-xl bg-slate-50 border-slate-200"><SelectValue placeholder="Select telco" /></SelectTrigger>
                            <SelectContent>
                              {MOMO_PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-600 font-semibold">Pickup Address *</Label>
                          <Input value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} className="h-12 sm:h-14 rounded-xl bg-slate-50 border-slate-200" />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label className="text-slate-600 font-semibold">Additional Info (Optional)</Label>
                          <Textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} placeholder="Any special instructions for the buyer or rider..." className="min-h-[100px] rounded-xl bg-slate-50 border-slate-200 resize-none" />
                        </div>
                      </div>
                    </div>

                    {/* Section: Payout Info */}
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-5 pb-2 border-b border-slate-100">
                        <Banknote className="h-5 w-5 text-primary" /> Your Payout Destination
                      </h3>
                      <div className="grid gap-5 sm:grid-cols-2 mb-6">
                        <div className="space-y-2">
                          <Label className="text-slate-600 font-semibold">MoMo Provider *</Label>
                          <Select value={momoProvider} onValueChange={v => setMomoProvider(v ?? '')}>
                            <SelectTrigger className="h-12 sm:h-14 rounded-xl bg-slate-50 border-slate-200"><SelectValue placeholder="Select provider" /></SelectTrigger>
                            <SelectContent>
                              {MOMO_PROVIDERS.map(p => <SelectItem key={p.value} value={p.bank_code}>{p.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-600 font-semibold">Name On MOMO Number *</Label>
                          <Input value={momoName} onChange={e => setMomoName(e.target.value)} placeholder="Exact account name" className="h-12 sm:h-14 rounded-xl bg-slate-50 border-slate-200" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-600 font-semibold">MOMO Number *</Label>
                          <Input value={momoNumber} onChange={e => setMomoNumber(e.target.value)} placeholder="024XXXXXXX" className="h-12 sm:h-14 rounded-xl bg-slate-50 border-slate-200" />
                        </div>
                      </div>

                      <div className="rounded-xl sm:rounded-2xl bg-blue-50/50 border border-blue-100 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-900">Seller Platform Fee (0.65%)</span>
                        </div>
                        <span className="font-bold text-lg text-blue-900">- GHS {sellerFee.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button 
                      onClick={handleDispatch} 
                      disabled={submitting} 
                      className="w-full h-12 sm:h-14 rounded-xl text-base sm:text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all"
                    >
                      {submitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Confirming Dispatch...</> : 'Confirm Dispatch & Get Code'}
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

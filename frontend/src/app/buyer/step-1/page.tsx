'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { SOURCE_PLATFORMS, PRODUCT_TYPES } from '@/lib/constants';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Shield, AlertTriangle, CheckCircle2, Loader2, Lock, ShoppingBag, Store, CreditCard, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function BuyerStep1() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();

  const [agreed, setAgreed] = useState(false);
  const [sourcePlatform, setSourcePlatform] = useState('');
  const [listingLink, setListingLink] = useState('');
  const [productType, setProductType] = useState('');
  const [productName, setProductName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [buyerName, setBuyerName] = useState('');
  const [refundBank, setRefundBank] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [productTotal, setProductTotal] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [txnShortId, setTxnShortId] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (profile) setBuyerName(profile.ghana_card_name || profile.full_name || '');
  }, [profile]);

  useEffect(() => {
    const ref = searchParams.get('ref');
    const txn = searchParams.get('txn');
    if (ref && txn) {
      verifyPaymentCallback(ref, txn);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function verifyPaymentCallback(ref: string, txnId: string) {
    try {
      await api.verifyPayment(ref);
      const { data: txn } = await api.getTransaction(txnId);
      setTxnShortId(txn.short_id);
      setPaymentSuccess(true);
      toast.success('Payment confirmed!');
    } catch {
      toast.error('Payment verification failed. Please contact support.');
    }
  }

  const riderReleaseFee = 1.0;
  const buyerFeePercent = 0.5;

  const total = useMemo(() => {
    const pt = parseFloat(productTotal) || 0;
    const df = parseFloat(deliveryFee) || 0;
    const platformFee = parseFloat((pt * buyerFeePercent / 100).toFixed(2));
    return { productTotal: pt, deliveryFee: df, platformFee, grand: pt + df + riderReleaseFee + platformFee };
  }, [productTotal, deliveryFee]);

  const linkWarning = listingLink && !listingLink.match(/^https?:\/\//);

  async function handleSubmit() {
    if (!agreed) { toast.error('Please accept the terms'); return; }
    if (!sourcePlatform || !productType || !productName || !deliveryAddress || !buyerName || !sellerPhone || !sellerName) {
      toast.error('Please fill all required fields'); return;
    }
    if (total.productTotal <= 0) { toast.error('Product total must be greater than 0'); return; }

    setSubmitting(true);
    try {
      const { data: txn } = await api.createTransaction({
        listing_link: listingLink || undefined,
        source_platform: sourcePlatform,
        product_type: productType,
        product_name: productName,
        delivery_address: deliveryAddress,
        delivery_date: deliveryDate?.toISOString().split('T')[0],
        buyer_name: buyerName,
        seller_phone: sellerPhone,
        seller_name: sellerName,
        product_total: total.productTotal,
        delivery_fee: total.deliveryFee,
        refund_bank_details: refundBank ? { info: refundBank } : undefined,
      });

      const { data: payment } = await api.initiatePayment(txn.id);
      window.location.href = payment.authorization_url;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create transaction');
      setSubmitting(false);
    }
  }

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  if (paymentSuccess) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg"
          >
            <div className="rounded-[2rem] bg-white shadow-2xl shadow-green-500/10 border border-green-100 overflow-hidden text-center">
              <div className="bg-green-500 py-10 px-6 text-white">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                  className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg"
                >
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </motion.div>
                <h2 className="text-3xl font-bold mb-2">Payment Secured!</h2>
                <p className="text-green-100 font-medium">Your funds are safely locked in escrow.</p>
              </div>
              
              <div className="p-8">
                <div className="mb-8">
                  <p className="text-sm text-slate-500 uppercase tracking-wider font-bold mb-2">Transaction ID</p>
                  <div className="inline-flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                    <span className="font-mono text-xl font-bold text-slate-900">{txnShortId}</span>
                    <button onClick={() => { navigator.clipboard.writeText(txnShortId); toast.success('Copied!'); }} className="text-slate-400 hover:text-primary transition-colors">
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left mb-8">
                  <div className="flex items-start gap-4">
                    <div className="bg-amber-100 p-2 rounded-full text-amber-600 shrink-0 mt-0.5">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-amber-900 mb-1">Keep Your Code Secret</p>
                      <p className="text-sm text-amber-800/80 leading-relaxed">
                        A unique delivery code has been generated. <strong className="text-amber-900">Do NOT share it</strong> until you have received and inspected your item. You will need it to release the funds.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={() => router.push('/hub')} className="flex-1 h-14 rounded-xl text-base font-bold shadow-lg shadow-primary/25">
                    Go to Dashboard
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/tracking')} className="flex-1 h-14 rounded-xl text-base font-bold border-slate-200">
                    Track Order
                  </Button>
                </div>
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
        <div className="bg-slate-950 pt-12 pb-32 text-white px-4">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white font-bold text-xl shadow-lg shadow-primary/30">
                1
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Secure Your Purchase</h1>
                <p className="text-slate-400 mt-1">Fill in the details to lock your funds in escrow.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="mx-auto max-w-4xl px-4 -mt-20 relative z-10">
          <div className="rounded-3xl bg-white shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col lg:flex-row">
            
            {/* Left Side: Form */}
            <div className="flex-[3] p-6 sm:p-10 lg:border-r border-slate-100">
              
              <div className="space-y-8">
                {/* Section 1: Item Details */}
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-5 pb-2 border-b border-slate-100">
                    <ShoppingBag className="h-5 w-5 text-primary" /> Item Details
                  </h3>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-semibold">Where did you find this? *</Label>
                      <Select value={sourcePlatform} onValueChange={setSourcePlatform}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200"><SelectValue placeholder="Select platform" /></SelectTrigger>
                        <SelectContent>
                          {SOURCE_PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-semibold">Product Category *</Label>
                      <Select value={productType} onValueChange={setProductType}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {PRODUCT_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-slate-600 font-semibold">Exact Product Name *</Label>
                      <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. iPhone 15 Pro Max 256GB" className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-slate-600 font-semibold">Listing URL (Optional)</Label>
                      <Input value={listingLink} onChange={e => setListingLink(e.target.value)} placeholder="https://instagram.com/p/..." className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                      {linkWarning && <p className="text-xs text-amber-600 flex items-center gap-1 mt-1"><AlertTriangle className="h-3 w-3" /> Please enter a valid URL</p>}
                    </div>
                  </div>
                </div>

                {/* Section 2: Delivery */}
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-5 pb-2 border-b border-slate-100">
                    <Store className="h-5 w-5 text-primary" /> Delivery & Parties
                  </h3>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-slate-600 font-semibold">Full Delivery Address *</Label>
                      <Textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="House number, Street, Landmark, City" className="min-h-[100px] rounded-xl bg-slate-50 border-slate-200 resize-none" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-semibold">Expected Delivery Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-12 rounded-xl bg-slate-50 border-slate-200 justify-start text-left font-normal text-slate-600">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {deliveryDate ? format(deliveryDate, 'PPP') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-xl"><Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} /></PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-semibold">Your Name (Ghana Card) *</Label>
                      <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-semibold">Seller's Phone Number *</Label>
                      <Input value={sellerPhone} onChange={e => setSellerPhone(e.target.value)} placeholder="+233..." className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-semibold">Seller's Name / Business *</Label>
                      <Input value={sellerName} onChange={e => setSellerName(e.target.value)} placeholder="e.g. Kojo Phones" className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Side: Pricing & Checkout */}
            <div className="flex-[2] bg-slate-50 p-6 sm:p-10 flex flex-col">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-6">
                <CreditCard className="h-5 w-5 text-primary" /> Payment Summary
              </h3>
              
              <div className="space-y-6 flex-1">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold">Agreed Product Price (GHS) *</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-slate-400">GHS</span>
                      <Input type="number" min="0" step="0.01" value={productTotal} onChange={e => setProductTotal(e.target.value)} placeholder="0.00" className="h-14 pl-14 text-xl font-bold rounded-xl border-slate-200 focus-visible:ring-primary/20" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold">Delivery Fee (GHS) *</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-slate-400">GHS</span>
                      <Input type="number" min="0" step="0.01" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} placeholder="0.00" className="h-14 pl-14 text-xl font-bold rounded-xl border-slate-200 focus-visible:ring-primary/20" />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex justify-between text-sm text-slate-600"><span>Item Total</span><span className="font-medium text-slate-900">GHS {total.productTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm text-slate-600"><span>Delivery</span><span className="font-medium text-slate-900">GHS {total.deliveryFee.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm text-slate-600"><span>Rider Release Fee</span><span className="font-medium text-slate-900">GHS {riderReleaseFee.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm text-slate-600"><span>Escrow Protection (0.5%)</span><span className="font-medium text-slate-900">GHS {total.platformFee.toFixed(2)}</span></div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-end">
                    <span className="font-bold text-slate-900">Total to Pay</span>
                    <span className="text-2xl font-extrabold text-primary">GHS {total.grand.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                  <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer text-blue-900 font-medium">
                    I agree to the <a href="/terms" className="underline hover:text-blue-700" target="_blank">Terms of Service</a>. I understand my funds will be locked in escrow until I confirm delivery.
                  </Label>
                </div>
              </div>

              <div className="mt-8">
                <Button 
                  onClick={handleSubmit} 
                  disabled={submitting || !agreed || total.grand <= 1.0} 
                  className="w-full h-14 rounded-xl text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all"
                >
                  {submitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Securing Funds...</> : `Pay GHS ${total.grand.toFixed(2)}`}
                </Button>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
                  <Lock className="h-3 w-3" /> Secured by Paystack
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

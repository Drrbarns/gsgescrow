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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Banknote, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

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
    return parseFloat(txn.product_total) - parseFloat(txn.seller_platform_fee) - parseFloat(txn.rider_release_fee);
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

  if (authLoading || loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (success) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-lg px-4 py-8 sm:py-16">
          <Card className="border-green-200 bg-green-50 text-center rounded-xl sm:rounded-2xl">
            <CardHeader className="px-4 sm:px-6">
              <CheckCircle2 className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-green-600 mb-3 sm:mb-4" />
              <CardTitle className="text-xl sm:text-2xl text-green-800">Payout Initiated!</CardTitle>
              <CardDescription className="text-green-700 text-sm sm:text-base">GHS {success.amount.toFixed(2)} is being processed to your MoMo account.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6"><Button onClick={() => router.push('/hub')} className="w-full sm:w-auto rounded-full">Back to Hub</Button></CardContent>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm sm:text-base shrink-0">2</div>
            <h1 className="text-xl sm:text-2xl font-bold">Collect Your Payout</h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">Enter both codes to verify and release your product funds.</p>
        </div>

        {!selected ? (
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <Card className="rounded-xl sm:rounded-2xl"><CardContent className="py-8 sm:py-12 text-center text-muted-foreground px-4 sm:px-6"><Banknote className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/40 mb-3 sm:mb-4" />No confirmed deliveries awaiting payout.</CardContent></Card>
            ) : (
              transactions.map(txn => (
                <Card key={txn.id} className="cursor-pointer hover:border-primary transition-colors rounded-xl sm:rounded-2xl" onClick={() => setSelected(txn)}>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between py-4 px-4 sm:px-6 gap-2 sm:gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{txn.product_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{txn.short_id} &middot; Buyer: {txn.buyer_name}</p>
                    </div>
                    <span className="font-bold text-green-700 shrink-0">GHS {calcNetPayout(txn).toFixed(2)}</span>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <Card className="rounded-xl sm:rounded-2xl">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">{selected.product_name}</CardTitle>
              <CardDescription>{selected.short_id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
              <div className="rounded-xl bg-muted/50 p-3 sm:p-4 space-y-2 text-sm overflow-hidden">
                <div className="flex justify-between gap-2"><span>Product Total</span><span className="shrink-0">GHS {parseFloat(selected.product_total).toFixed(2)}</span></div>
                <div className="flex justify-between gap-2"><span>Seller Fee (0.75%)</span><span className="shrink-0">- GHS {parseFloat(selected.seller_platform_fee).toFixed(2)}</span></div>
                <div className="flex justify-between gap-2"><span>Rider Release Fee</span><span className="shrink-0">- GHS {parseFloat(selected.rider_release_fee).toFixed(2)}</span></div>
                <Separator />
                <div className="flex justify-between font-bold text-base sm:text-lg gap-2"><span>Net Payout</span><span className="text-green-700 shrink-0">GHS {calcNetPayout(selected).toFixed(2)}</span></div>
              </div>

              {SIMULATION_MODE && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm">
                  <p className="font-medium text-amber-800">Simulation: use delivery code <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">SIM0000</code> and partial code <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">SIM0</code></p>
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => { setDeliveryCode('SIM0000'); setPartialCode('SIM0'); }}>Fill codes</Button>
                </div>
              )}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Delivery Code (7 characters) *</Label>
                  <Input value={deliveryCode} onChange={e => setDeliveryCode(e.target.value.toUpperCase())} maxLength={7} placeholder={SIMULATION_MODE ? 'SIM0000' : 'ABC1234'} className="h-12 sm:h-14 font-mono text-base sm:text-lg tracking-widest" />
                </div>
                <div className="space-y-2">
                  <Label>Partial Code (4 characters) *</Label>
                  <Input value={partialCode} onChange={e => setPartialCode(e.target.value.toUpperCase())} maxLength={4} placeholder={SIMULATION_MODE ? 'SIM0' : 'AB12'} className="h-12 sm:h-14 font-mono text-base sm:text-lg tracking-widest" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => setSelected(null)} className="rounded-full w-full sm:w-auto">Back</Button>
                <Button onClick={handleCollect} disabled={submitting} size="lg" className="flex-1 rounded-full w-full sm:w-auto h-12 sm:h-auto">
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : `Collect GHS ${calcNetPayout(selected).toFixed(2)}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
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
        <main className="mx-auto max-w-lg px-4 py-16">
          <Card className="border-green-200 bg-green-50 text-center">
            <CardHeader>
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-600 mb-4" />
              <CardTitle className="text-2xl text-green-800">Payout Initiated!</CardTitle>
              <CardDescription className="text-green-700">GHS {success.amount.toFixed(2)} is being processed to your MoMo account.</CardDescription>
            </CardHeader>
            <CardContent><Button onClick={() => router.push('/hub')} className="rounded-full">Back to Hub</Button></CardContent>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">2</div>
            <h1 className="text-2xl font-bold">Collect Your Payout</h1>
          </div>
          <p className="text-muted-foreground">Enter both codes to verify and release your product funds.</p>
        </div>

        {!selected ? (
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground"><Banknote className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />No confirmed deliveries awaiting payout.</CardContent></Card>
            ) : (
              transactions.map(txn => (
                <Card key={txn.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelected(txn)}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-semibold">{txn.product_name}</p>
                      <p className="text-sm text-muted-foreground">{txn.short_id} &middot; Buyer: {txn.buyer_name}</p>
                    </div>
                    <span className="font-bold text-green-700">GHS {calcNetPayout(txn).toFixed(2)}</span>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{selected.product_name}</CardTitle>
              <CardDescription>{selected.short_id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>Product Total</span><span>GHS {parseFloat(selected.product_total).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Seller Fee (0.75%)</span><span>- GHS {parseFloat(selected.seller_platform_fee).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Rider Release Fee</span><span>- GHS {parseFloat(selected.rider_release_fee).toFixed(2)}</span></div>
                <Separator />
                <div className="flex justify-between font-bold text-lg"><span>Net Payout</span><span className="text-green-700">GHS {calcNetPayout(selected).toFixed(2)}</span></div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Delivery Code (7 characters) *</Label>
                  <Input value={deliveryCode} onChange={e => setDeliveryCode(e.target.value.toUpperCase())} maxLength={7} placeholder="ABC1234" className="font-mono text-lg tracking-widest" />
                </div>
                <div className="space-y-2">
                  <Label>Partial Code (4 characters) *</Label>
                  <Input value={partialCode} onChange={e => setPartialCode(e.target.value.toUpperCase())} maxLength={4} placeholder="AB12" className="font-mono text-lg tracking-widest" />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setSelected(null)} className="rounded-full">Back</Button>
                <Button onClick={handleCollect} disabled={submitting} size="lg" className="flex-1 rounded-full">
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

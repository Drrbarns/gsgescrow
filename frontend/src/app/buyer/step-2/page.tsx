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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, Truck, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

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

  if (authLoading || loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (success) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-lg px-4 py-16">
          <Card className="border-green-200 bg-green-50 text-center">
            <CardHeader>
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-600 mb-4" />
              <CardTitle className="text-green-800">Rider Payment Sent!</CardTitle>
              <CardDescription className="text-green-700">The rider payout has been queued and will be processed shortly.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/hub')} className="rounded-full">Back to Hub</Button>
            </CardContent>
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
            <h1 className="text-2xl font-bold">Confirm Delivery & Pay Rider</h1>
          </div>
          <p className="text-muted-foreground">Select your dispatched order, then confirm delivery or request replacement.</p>
        </div>

        {!selected ? (
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No dispatched transactions found.</CardContent></Card>
            ) : (
              transactions.map(txn => (
                <Card key={txn.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelected(txn)}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-semibold">{txn.product_name}</p>
                      <p className="text-sm text-muted-foreground">{txn.short_id} &middot; GHS {txn.grand_total}</p>
                    </div>
                    <Badge className={TRANSACTION_STATUSES[txn.status]?.color}>{TRANSACTION_STATUSES[txn.status]?.label}</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <Button variant="ghost" onClick={() => setSelected(null)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>

            <Card>
              <CardHeader>
                <CardTitle>{selected.product_name}</CardTitle>
                <CardDescription>{selected.short_id} &middot; Seller: {selected.seller_name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-xl bg-muted/50 p-4 grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Product Total</span><p className="font-medium">GHS {selected.product_total}</p></div>
                  <div><span className="text-muted-foreground">Delivery Fee</span><p className="font-medium">GHS {selected.delivery_fee}</p></div>
                  <div><span className="text-muted-foreground">Rider</span><p className="font-medium">{selected.rider_name} ({selected.rider_phone})</p></div>
                  <div><span className="text-muted-foreground">Status</span><Badge className={TRANSACTION_STATUSES[selected.status]?.color}>{TRANSACTION_STATUSES[selected.status]?.label}</Badge></div>
                </div>

                {selected.product_type === 'non_food' && (
                  <>
                    <Button variant="outline" onClick={handleRequestReplacement} disabled={submitting} className="w-full gap-2 rounded-full">
                      <RefreshCw className="h-4 w-4" /> Waiting for Replacement
                    </Button>
                    <div className="text-center text-sm text-muted-foreground">— OR —</div>
                  </>
                )}

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2"><Truck className="h-4 w-4" /> Product Delivered — Pay Rider</h3>
                  {SIMULATION_MODE && simDeliveryCode && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm">
                      <p className="font-medium text-amber-800">Simulation: use delivery code <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">{simDeliveryCode}</code></p>
                      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setDeliveryCode(simDeliveryCode)}>Fill code</Button>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Delivery Code (7 characters) *</Label>
                    <Input value={deliveryCode} onChange={e => setDeliveryCode(e.target.value.toUpperCase())} maxLength={7} placeholder={SIMULATION_MODE ? 'SIM0000' : 'ABC1234'} className="font-mono text-lg tracking-widest" />
                  </div>
                  <div className="space-y-2">
                    <Label>Rider MoMo Number *</Label>
                    <Input value={riderMomo} onChange={e => setRiderMomo(e.target.value)} placeholder="024XXXXXXX" />
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3 text-sm">
                    <p>Rider will receive: <span className="font-bold">GHS {(parseFloat(selected.delivery_fee) + parseFloat(selected.rider_release_fee)).toFixed(2)}</span></p>
                  </div>
                  <Button onClick={handlePayRider} disabled={submitting} size="lg" className="w-full rounded-full">
                    {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Confirm & Pay Rider'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

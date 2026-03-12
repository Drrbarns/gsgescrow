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
import { Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function BuyerStep3() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchTransactions() {
    try {
      const { data } = await api.listTransactions({ status: 'REPLACEMENT_PENDING' });
      setTransactions(data);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(txnId: string) {
    const code = codes[txnId];
    if (!code || code.length !== 7) { toast.error('Enter a valid 7-character delivery code'); return; }

    setSubmitting(txnId);
    try {
      await api.verifyDelivery(txnId, code);
      toast.success('Replacement delivery confirmed!');
      setTransactions(prev => prev.filter(t => t.id !== txnId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify');
    } finally {
      setSubmitting(null);
    }
  }

  if (authLoading || loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">3</div>
            <h1 className="text-2xl font-bold">Replacement Confirmation</h1>
          </div>
          <p className="text-muted-foreground">Confirm delivery of your replacement item using your delivery code.</p>
        </div>

        {transactions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No pending replacements found.</p>
              <Button variant="link" onClick={() => router.push('/hub')} className="mt-2">Go to Transaction Hub</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {transactions.map(txn => (
              <Card key={txn.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{txn.product_name}</CardTitle>
                  <CardDescription>{txn.short_id} &middot; Seller: {txn.seller_name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Delivery Code (7 characters)</Label>
                    <Input
                      value={codes[txn.id] || ''}
                      onChange={e => setCodes(prev => ({ ...prev, [txn.id]: e.target.value.toUpperCase() }))}
                      maxLength={7}
                      placeholder="ABC1234"
                      className="font-mono text-lg tracking-widest"
                    />
                  </div>
                  <Button onClick={() => handleConfirm(txn.id)} disabled={submitting === txn.id} className="w-full rounded-full">
                    {submitting === txn.id ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : (
                      <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Replacement Delivered</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

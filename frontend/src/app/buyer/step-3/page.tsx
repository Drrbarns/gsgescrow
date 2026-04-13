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
import { Loader2, CheckCircle2, RefreshCw, Package } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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

  if (authLoading || loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Header />
      
      <main className="flex-1 pb-16 sm:pb-24">
        {/* Intro Section */}
        <div className="border-b border-slate-200/80 bg-white">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Step 3 of 3</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Replacement Confirmation</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              Confirm delivery of your replacement item using your secure delivery code.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 pt-8 sm:pt-10">
          <AnimatePresence mode="wait">
            {transactions.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-sm"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 mb-4">
                  <RefreshCw className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No pending replacements</h3>
                <p className="mt-2 text-sm text-slate-500">You don't have any replacement items waiting for confirmation.</p>
                <Button variant="outline" onClick={() => router.push('/hub')} className="mt-6 rounded-xl">Go to Dashboard</Button>
              </motion.div>
            ) : (
              <motion.div 
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {transactions.map((txn, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={txn.id}
                    className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm"
                  >
                    <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-5 sm:px-8 sm:py-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
                            <Package className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <h2 className="truncate font-bold text-slate-900 text-lg sm:text-xl">{txn.product_name}</h2>
                            <p className="mt-1 text-sm text-slate-500 font-medium flex items-center gap-2">
                              <span className="font-mono">{txn.short_id}</span>
                              <span>&middot;</span>
                              <span>Seller: <span className="text-slate-700">{txn.seller_name}</span></span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 sm:p-8 space-y-6">
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">Delivery Code (7 characters) *</Label>
                        <Input
                          value={codes[txn.id] || ''}
                          onChange={e => setCodes(prev => ({ ...prev, [txn.id]: e.target.value.toUpperCase() }))}
                          maxLength={7}
                          placeholder="ABC1234"
                          className="h-14 font-mono text-lg tracking-[0.2em] rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white text-center uppercase max-w-sm mx-auto sm:mx-0"
                        />
                      </div>

                      <Button 
                        onClick={() => handleConfirm(txn.id)} 
                        disabled={submitting === txn.id || (codes[txn.id]?.length || 0) < 7} 
                        size="lg" 
                        className="w-full sm:w-auto rounded-xl h-14 text-base font-bold shadow-lg shadow-primary/20"
                      >
                        {submitting === txn.id ? (
                          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</>
                        ) : (
                          <><CheckCircle2 className="mr-2 h-5 w-5" /> Confirm Replacement Delivered</>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
}

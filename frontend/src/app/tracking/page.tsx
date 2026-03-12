'use client';

import { useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TRANSACTION_STATUSES } from '@/lib/constants';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Loader2,
  FileText,
  CreditCard,
  Truck,
  Navigation,
  PackageCheck,
  CheckCircle2,
  CircleDot,
  Circle,
  AlertTriangle,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';

const TIMELINE_STEPS = [
  { key: 'SUBMITTED', label: 'Created', icon: FileText },
  { key: 'PAID', label: 'Paid', icon: CreditCard },
  { key: 'DISPATCHED', label: 'Dispatched', icon: Truck },
  { key: 'IN_TRANSIT', label: 'In Transit', icon: Navigation },
  { key: 'DELIVERED_CONFIRMED', label: 'Delivered', icon: PackageCheck },
  { key: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
];

function getStepIndex(status: string) {
  const idx = TIMELINE_STEPS.findIndex((s) => s.key === status);
  if (status === 'DELIVERED_PENDING') return 4;
  if (status === 'REPLACEMENT_PENDING') return 4;
  return idx === -1 ? 0 : idx;
}

interface Transaction {
  id: string;
  sbs_id: string;
  status: string;
  product_name: string;
  product_price: number;
  delivery_fee: number;
  seller_phone: string;
  buyer_phone: string;
  created_at: string;
  updated_at: string;
}

export default function TrackingPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      toast.error('Enter a Transaction ID (SBS-XXXXXXXX) or phone number');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await api.trackTransaction(trimmed);
      setResults(res.data || []);
      if (!res.data?.length) {
        toast.info('No transactions found for that query.');
      }
    } catch {
      toast.error('Could not fetch tracking information. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main className="flex-1">
        {/* Premium Hero Section */}
        <section className="relative overflow-hidden bg-slate-950 pt-24 pb-48 text-white">
          {/* Abstract Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-[20%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
            <div className="absolute bottom-0 right-[10%] w-[30%] h-[30%] rounded-full bg-blue-500/20 blur-[120px]" />
          </div>

          <div className="relative mx-auto max-w-4xl px-4 text-center z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-blue-200 backdrop-blur-md border border-white/10 mb-6"
            >
              <MapPin className="h-4 w-4" />
              <span>Real-Time Escrow Tracking</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl mb-6"
            >
              Track Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary">Transaction</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mx-auto max-w-2xl text-lg text-slate-300 mb-10"
            >
              Enter your secure Transaction ID or phone number to see the live status of your funds and delivery.
            </motion.p>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="mx-auto max-w-2xl flex gap-3 p-2 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl"
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
                <Input
                  placeholder="e.g. SBS-12345678 or 024XXXXXXX"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-14 pl-12 rounded-xl bg-transparent border-none text-white placeholder:text-white/50 text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
                  autoFocus
                />
              </div>
              <Button 
                type="submit" 
                className="h-14 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/25 transition-all" 
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Track Order'}
              </Button>
            </motion.form>
          </div>
        </section>

        {/* Floating Results Section */}
        <section className="relative z-20 mx-auto max-w-4xl px-4 -mt-20 pb-24">
          <AnimatePresence mode="wait">
            {!loading && searched && results.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="rounded-3xl bg-white shadow-xl border border-slate-100 p-16 text-center"
              >
                <div className="mx-auto w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <Search className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">No transaction found</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  We couldn't find any active escrow matching that ID or phone number. Please double-check and try again.
                </p>
              </motion.div>
            )}

            {!loading && results.map((tx, index) => {
              const currentIdx = getStepIndex(tx.status);
              const statusInfo = TRANSACTION_STATUSES[tx.status];
              const isTerminal = ['CANCELLED', 'DISPUTE', 'HOLD'].includes(tx.status);

              return (
                <motion.div 
                  key={tx.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="mb-8 rounded-3xl bg-white shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
                >
                  {/* Header */}
                  <div className="bg-slate-50/50 border-b border-slate-100 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                            {tx.sbs_id || tx.id}
                          </h2>
                          {statusInfo && (
                            <Badge className={`${statusInfo.color} rounded-full px-3 py-1 font-semibold uppercase tracking-wider text-[10px]`}>
                              {statusInfo.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-500 font-medium">
                          {tx.product_name} &middot; <span className="text-slate-900">GHS {((tx.product_price || 0) + (tx.delivery_fee || 0)).toLocaleString()}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 sm:p-10">
                    {isTerminal ? (
                      <div className="rounded-2xl bg-red-50 border border-red-100 p-6 flex items-start gap-4">
                        <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-lg font-bold text-red-900 mb-1">Transaction {statusInfo?.label || tx.status}</h4>
                          <p className="text-red-700">
                            This transaction has been flagged or stopped. Funds are secured. Please contact support for further assistance and resolution.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8">
                        <div className="relative flex items-center justify-between max-w-3xl mx-auto">
                          {/* Background Track */}
                          <div className="absolute left-[10%] right-[10%] top-1/2 h-1 -translate-y-1/2 bg-slate-100 rounded-full" />
                          
                          {/* Active Track */}
                          <div
                            className="absolute left-[10%] top-1/2 h-1 -translate-y-1/2 bg-primary rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${(currentIdx / (TIMELINE_STEPS.length - 1)) * 80}%`,
                            }}
                          />

                          {TIMELINE_STEPS.map((s, i) => {
                            const StepIcon = s.icon;
                            const isPast = i < currentIdx;
                            const isCurrent = i === currentIdx;

                            return (
                              <div
                                key={s.key}
                                className="relative z-10 flex flex-col items-center gap-3 w-20"
                              >
                                <motion.div
                                  initial={false}
                                  animate={{
                                    scale: isCurrent ? 1.2 : 1,
                                    backgroundColor: isCurrent ? 'var(--primary)' : isPast ? '#eff6ff' : '#ffffff',
                                    borderColor: isCurrent ? 'var(--primary)' : isPast ? '#3b82f6' : '#e2e8f0',
                                    color: isCurrent ? '#ffffff' : isPast ? '#3b82f6' : '#94a3b8'
                                  }}
                                  className="flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-sm bg-white"
                                >
                                  {isCurrent ? (
                                    <CircleDot className="h-5 w-5" />
                                  ) : isPast ? (
                                    <StepIcon className="h-5 w-5" />
                                  ) : (
                                    <Circle className="h-5 w-5" />
                                  )}
                                </motion.div>
                                <span
                                  className={`text-xs font-bold text-center transition-colors ${
                                    isCurrent
                                      ? 'text-primary'
                                      : isPast
                                        ? 'text-slate-900'
                                        : 'text-slate-400'
                                  }`}
                                >
                                  {s.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Details Grid */}
                    <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4 pt-8 border-t border-slate-100">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Buyer</p>
                        <p className="font-semibold text-slate-900">{tx.buyer_phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Seller</p>
                        <p className="font-semibold text-slate-900">{tx.seller_phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Created</p>
                        <p className="font-semibold text-slate-900">
                          {tx.created_at
                            ? new Date(tx.created_at).toLocaleDateString('en-GH', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Last Updated</p>
                        <p className="font-semibold text-slate-900">
                          {tx.updated_at
                            ? new Date(tx.updated_at).toLocaleDateString('en-GH', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </section>
      </main>

      <Footer />
    </div>
  );
}

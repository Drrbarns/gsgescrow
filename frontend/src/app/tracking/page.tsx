'use client';

import { useState, useCallback, useEffect } from 'react';
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
  MapPin,
  Clock
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
  short_id?: string;
  sbs_id?: string;
  status: string;
  product_name: string;
  product_total?: number;
  delivery_fee?: number;
  grand_total?: number;
  seller_phone: string;
  buyer_phone: string;
  created_at: string;
  updated_at: string;
  paid_at?: string | null;
}

export default function TrackingPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async (rawQuery: string) => {
    const trimmed = rawQuery.trim();
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
  }, []);

  const handleSearch = useCallback(async () => {
    await runSearch(query);
  }, [query, runSearch]);

  useEffect(() => {
    const prefillQuery = new URLSearchParams(window.location.search).get('q')?.trim() || '';
    if (!prefillQuery) return;
    setQuery(prefillQuery);
    runSearch(prefillQuery);
  }, [runSearch]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-slate-950 pt-12 pb-24 sm:pt-20 sm:pb-32 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.15),transparent_36%),radial-gradient(circle_at_100%_0%,rgba(59,130,246,0.15),transparent_38%)]" />
          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/20 px-4 py-1.5 text-xs sm:text-sm font-bold tracking-wide text-primary-foreground backdrop-blur-sm"
            >
              <MapPin className="h-4 w-4" />
              <span>Real-Time Order Tracking</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mt-6 text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Track Your Transaction
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="mt-4 max-w-2xl mx-auto text-base leading-relaxed text-slate-400 sm:text-lg"
            >
              Enter your secure Transaction ID or phone number to instantly check the latest delivery and payout progress.
            </motion.p>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="mt-10 mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row relative z-20"
            >
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="e.g. SBS-12345678 or 024XXXXXXX"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-14 sm:h-16 rounded-2xl border-2 border-white/10 bg-white/5 pl-14 text-lg text-white placeholder:text-slate-500 focus-visible:border-primary focus-visible:bg-white/10 focus-visible:ring-0 backdrop-blur-md transition-all"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="h-14 sm:h-16 w-full rounded-2xl px-8 text-lg font-bold shadow-xl shadow-primary/20 sm:w-auto transition-transform active:scale-95"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Track Order'}
              </Button>
            </motion.form>
          </div>
        </section>

        {/* Results Section */}
        <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 sm:pb-24 -mt-12 sm:-mt-16 relative z-10">
          <AnimatePresence mode="wait">
            {!loading && searched && results.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="rounded-3xl bg-white shadow-2xl shadow-slate-200/40 border border-slate-100 p-10 sm:p-16 text-center"
              >
                <div className="mx-auto w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                  <Search className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">No transaction found</h3>
                <p className="text-slate-500 max-w-md mx-auto text-base">
                  We could not find any active order matching that ID or phone number. Please double-check and try again.
                </p>
              </motion.div>
            )}

            {!loading && results.map((tx, index) => {
              const displayId = tx.short_id || tx.sbs_id || tx.id;
              const lineTotal =
                tx.grand_total != null
                  ? Number(tx.grand_total)
                  : Number(tx.product_total || 0) + Number(tx.delivery_fee || 0);
              const currentIdx = getStepIndex(tx.status);
              const statusInfo = TRANSACTION_STATUSES[tx.status];
              const isTerminal = ['CANCELLED', 'DISPUTE', 'HOLD'].includes(tx.status);

              return (
                <motion.div 
                  key={displayId || tx.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="mb-8 rounded-3xl bg-white shadow-2xl shadow-slate-200/40 border border-slate-100 overflow-hidden"
                >
                  {/* Header */}
                  <div className="bg-slate-50/80 border-b border-slate-100 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                      <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
                        <ShieldCheck className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            {displayId}
                          </h2>
                          {statusInfo && (
                            <Badge className={`${statusInfo.color} rounded-full px-3.5 py-1.5 font-bold uppercase tracking-wider text-[11px]`}>
                              {statusInfo.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-600 font-medium text-base">
                          {tx.product_name}
                        </p>
                      </div>
                    </div>
                    <div className="sm:text-right bg-white sm:bg-transparent p-4 sm:p-0 rounded-2xl border sm:border-none border-slate-100">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total Amount</p>
                      <p className="text-2xl sm:text-3xl font-black text-primary">
                        GHS {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 sm:p-10">
                    {isTerminal ? (
                      <div className="rounded-2xl bg-red-50 border border-red-100 p-5 sm:p-8 flex items-start gap-4">
                        <div className="bg-red-100 p-3 rounded-xl shrink-0">
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-red-900 mb-2">Transaction {statusInfo?.label || tx.status}</h4>
                          <p className="text-red-700 font-medium leading-relaxed">
                            This transaction has been flagged or stopped. Funds are secured. Please contact support for further assistance and resolution.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 sm:py-10 overflow-x-auto">
                        <div className="relative flex items-center justify-between max-w-4xl mx-auto min-w-[600px] px-4 sm:px-0">
                          {/* Background Track */}
                          <div className="absolute left-[8%] right-[8%] top-1/2 h-1.5 -translate-y-1/2 bg-slate-100 rounded-full" />
                          
                          {/* Active Track */}
                          <div
                            className="absolute left-[8%] top-1/2 h-1.5 -translate-y-1/2 bg-primary rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${(currentIdx / (TIMELINE_STEPS.length - 1)) * 84}%`,
                            }}
                          />

                          {TIMELINE_STEPS.map((s, i) => {
                            const StepIcon = s.icon;
                            const isPast = i < currentIdx;
                            const isCurrent = i === currentIdx;

                            return (
                              <div
                                key={s.key}
                                className="relative z-10 flex flex-col items-center gap-4 w-24"
                              >
                                <motion.div
                                  initial={false}
                                  animate={{
                                    scale: isCurrent ? 1.15 : 1,
                                    backgroundColor: isCurrent ? 'var(--primary)' : isPast ? '#eff6ff' : '#ffffff',
                                    borderColor: isCurrent ? 'var(--primary)' : isPast ? '#3b82f6' : '#e2e8f0',
                                    color: isCurrent ? '#ffffff' : isPast ? '#3b82f6' : '#94a3b8'
                                  }}
                                  className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 shadow-sm bg-white transition-colors duration-500"
                                >
                                  {isCurrent ? (
                                    <CircleDot className="h-6 w-6" />
                                  ) : isPast ? (
                                    <StepIcon className="h-6 w-6" />
                                  ) : (
                                    <Circle className="h-6 w-6" />
                                  )}
                                </motion.div>
                                <span
                                  className={`text-xs sm:text-sm font-bold text-center transition-colors duration-500 ${
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
                    <div className="mt-8 sm:mt-12 grid grid-cols-2 gap-6 sm:gap-8 sm:grid-cols-4 pt-8 sm:pt-10 border-t border-slate-100">
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5"><span className="flex h-4 w-4 items-center justify-center rounded bg-blue-100 text-[9px] text-blue-700">B</span> Buyer</p>
                        <p className="font-bold text-slate-900 sm:text-lg">{tx.buyer_phone || '—'}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5"><span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-100 text-[9px] text-emerald-700">S</span> Seller</p>
                        <p className="font-bold text-slate-900 sm:text-lg">{tx.seller_phone || '—'}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Created</p>
                        <p className="font-bold text-slate-900 sm:text-lg">
                          {tx.created_at
                            ? new Date(tx.created_at).toLocaleDateString('en-GH', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Updated</p>
                        <p className="font-bold text-slate-900 sm:text-lg">
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

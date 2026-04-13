'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { TRANSACTION_STATUSES, SOURCE_PLATFORMS } from '@/lib/constants';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, Search, MoreHorizontal, Eye, Truck, CheckCircle, 
  AlertCircle, Banknote, ChevronLeft, ChevronRight, 
  LayoutDashboard, Filter, ArrowRightLeft, Clock, ClipboardList, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type HubTransaction = {
  id: string;
  status: string;
  short_id: string;
  product_name: string;
  buyer_name?: string;
  buyer_phone?: string;
  seller_name?: string;
  seller_phone?: string;
  grand_total: string;
  created_at: string;
  platform?: string;
};

type ContinueAction = {
  label: string;
  route?: string;
  type: 'route' | 'pay';
};

export default function HubPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<HubTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [page, setPage] = useState(1);
  const [payingTxnId, setPayingTxnId] = useState<string | null>(null);
  const limit = 15;

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user, page, statusFilter, platformFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchTransactions() {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (platformFilter) params.platform = platformFilter;
      const res = await api.listTransactions(params);
      setTransactions(res.data);
      setTotal(res.total);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    setPage(1);
    fetchTransactions();
  }

  function focusStatus(status: string) {
    setStatusFilter(status);
    setPage(1);
  }

  async function handlePayNow(txnId: string) {
    setPayingTxnId(txnId);
    try {
      const { data } = await api.initiatePayment(txnId);
      if (!data?.authorization_url) throw new Error('Payment link unavailable');
      window.location.href = data.authorization_url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to start payment');
    } finally {
      setPayingTxnId(null);
    }
  }

  const totalPages = Math.ceil(total / limit);
  const role = profile?.role;
  const roleHeading = role === 'buyer' ? 'Buyer Command Center' : role === 'seller' ? 'Seller Command Center' : 'Transaction Hub';
  const roleDescription =
    role === 'buyer'
      ? 'Pay pending orders, confirm deliveries, and keep every purchase protected in one place.'
      : role === 'seller'
        ? 'Dispatch paid orders, track active deliveries, and collect payouts from one control center.'
        : 'Manage all secure PSP payments, track deliveries, and release funds from one central dashboard.';
  const submittedCount = transactions.filter((t) => t.status === 'SUBMITTED').length;
  const paidCount = transactions.filter((t) => t.status === 'PAID').length;
  const dispatchedCount = transactions.filter((t) => t.status === 'DISPATCHED').length;
  const deliveredConfirmedCount = transactions.filter((t) => t.status === 'DELIVERED_CONFIRMED').length;
  const completedCount = transactions.filter((t) => t.status === 'COMPLETED').length;
  const activeCount = transactions.filter((t) => !['COMPLETED', 'CANCELLED'].includes(t.status)).length;
  const statusPriority: Record<string, number> = {
    DELIVERED_CONFIRMED: 1,
    DISPATCHED: 2,
    PAID: 3,
    SUBMITTED: 4,
    COMPLETED: 5,
    CANCELLED: 6,
  };
  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        const rankA = statusPriority[a.status] ?? 9;
        const rankB = statusPriority[b.status] ?? 9;
        if (rankA !== rankB) return rankA - rankB;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [transactions]
  );

  function getContinueAction(txn: HubTransaction): ContinueAction | null {
    if (txn.status === 'SUBMITTED' && role !== 'seller') return { label: 'Pay Now', type: 'pay' };
    if (txn.status === 'PAID' && role !== 'buyer') return { label: 'Continue Dispatch', type: 'route', route: '/seller/step-1' };
    if (txn.status === 'DISPATCHED' && role !== 'seller') return { label: 'Continue Delivery', type: 'route', route: '/buyer/step-2' };
    if (txn.status === 'DELIVERED_CONFIRMED' && role !== 'buyer') return { label: 'Continue Payout', type: 'route', route: '/seller/step-2' };
    return null;
  }

  if (authLoading) return null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      
      <main className="flex-1 pb-12 sm:pb-24">
        {/* Hero Section */}
        <div className="bg-slate-950 pt-8 pb-24 sm:pt-12 sm:pb-32 text-white px-4 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent_50%)]" />
          <div className="mx-auto max-w-7xl relative z-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/20 px-3 py-1 text-xs font-semibold text-primary-foreground backdrop-blur-sm">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Transaction Dashboard
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
                  {roleHeading}
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
                  {roleDescription}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {role === 'seller' && (
                    <Button variant="secondary" className="rounded-xl h-11 px-6 font-semibold" onClick={() => router.push('/seller/verify')}>
                      Complete Seller KYC
                    </Button>
                  )}
                  {role === 'buyer' && (
                    <Button variant="secondary" className="rounded-xl h-11 px-6 font-semibold" onClick={() => router.push('/buyer/verify')}>
                      Complete Buyer KYC
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:min-w-[320px] mt-6 lg:mt-0">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Transactions</p>
                  <p className="mt-2 text-3xl font-black text-white">{total}</p>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-5 backdrop-blur-md">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary-foreground/80">Active Deals</p>
                  <p className="mt-2 text-3xl font-black text-white">{activeCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="mx-auto max-w-7xl px-4 -mt-16 sm:-mt-20 relative z-10">
          {/* Search & Filter Bar */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xl shadow-slate-200/40 mb-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by transaction ID, phone, or product name"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="h-12 sm:h-14 rounded-xl border-slate-200 bg-slate-50 pl-12 text-base focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex">
                <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(!v || v === 'all' ? '' : v); setPage(1); }}>
                  <SelectTrigger className="h-12 sm:h-14 w-full rounded-xl border-slate-200 bg-slate-50 sm:w-[200px] text-base">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="All Statuses" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(TRANSACTION_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={platformFilter || 'all'} onValueChange={v => { setPlatformFilter(!v || v === 'all' ? '' : v); setPage(1); }}>
                  <SelectTrigger className="h-12 sm:h-14 w-full rounded-xl border-slate-200 bg-slate-50 sm:w-[180px] text-base">
                    <SelectValue placeholder="All Platforms" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Platforms</SelectItem>
                    {SOURCE_PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSearch} className="h-12 sm:h-14 rounded-xl px-8 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                Search
              </Button>
            </div>
          </div>

          {/* Status Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <button type="button" onClick={() => focusStatus('SUBMITTED')} className="group flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 text-left transition-all hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/10">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-700 transition-colors">Awaiting Payment</p>
              <div className="mt-3 flex w-full items-end justify-between">
                <p className="text-3xl sm:text-4xl font-black text-amber-600">{submittedCount}</p>
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500 group-hover:scale-110 transition-transform">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-500">Buyer needs to pay</p>
            </button>
            <button type="button" onClick={() => focusStatus('PAID')} className="group flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 text-left transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-primary transition-colors">Paid Orders</p>
              <div className="mt-3 flex w-full items-end justify-between">
                <p className="text-3xl sm:text-4xl font-black text-primary">{paidCount}</p>
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-500">Ready for dispatch</p>
            </button>
            <button type="button" onClick={() => focusStatus('DISPATCHED')} className="group flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 text-left transition-all hover:border-sky-300 hover:shadow-xl hover:shadow-sky-500/10">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-sky-700 transition-colors">In Delivery</p>
              <div className="mt-3 flex w-full items-end justify-between">
                <p className="text-3xl sm:text-4xl font-black text-sky-600">{dispatchedCount}</p>
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-500 group-hover:scale-110 transition-transform">
                  <Truck className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-500">Waiting buyer confirmation</p>
            </button>
            <button type="button" onClick={() => focusStatus('COMPLETED')} className="group flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 text-left transition-all hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 transition-colors">Completed</p>
              <div className="mt-3 flex w-full items-end justify-between">
                <p className="text-3xl sm:text-4xl font-black text-emerald-600">{completedCount}</p>
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 group-hover:scale-110 transition-transform">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-500">Fully finished transactions</p>
            </button>
          </div>

          {/* Workflow Board */}
          <div className="mb-8 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-xl shadow-slate-200/40">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Workflow Board</h3>
                <p className="text-sm text-slate-500 mt-1">Use this flow to move each transaction to completion.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-9 rounded-xl font-medium" onClick={() => focusStatus('SUBMITTED')}>1. Pay</Button>
                <Button size="sm" variant="outline" className="h-9 rounded-xl font-medium" onClick={() => focusStatus('PAID')}>2. Dispatch</Button>
                <Button size="sm" variant="outline" className="h-9 rounded-xl font-medium" onClick={() => focusStatus('DISPATCHED')}>3. Confirm Delivery</Button>
                <Button size="sm" variant="outline" className="h-9 rounded-xl font-medium" onClick={() => focusStatus('DELIVERED_CONFIRMED')}>4. Payout</Button>
                <Button size="sm" variant="ghost" className="h-9 rounded-xl font-medium" onClick={() => focusStatus('')}>Show All</Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Pay</p>
                <p className="mt-2 text-2xl font-black text-amber-900">{submittedCount}</p>
                <p className="mt-1 text-sm font-medium text-amber-800/70">Transactions waiting for buyer payment.</p>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-primary/[0.02] p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Dispatch</p>
                <p className="mt-2 text-2xl font-black text-primary">{paidCount}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">Paid and waiting for seller dispatch.</p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Confirm</p>
                <p className="mt-2 text-2xl font-black text-sky-800">{dispatchedCount}</p>
                <p className="mt-1 text-sm font-medium text-sky-800/70">In transit; buyer should confirm delivery.</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Payout/Done</p>
                <p className="mt-2 text-2xl font-black text-emerald-800">{deliveredConfirmedCount + completedCount}</p>
                <p className="mt-1 text-sm font-medium text-emerald-800/70">Ready payout plus fully completed orders.</p>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200 overflow-hidden min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="font-medium">Loading your transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center px-4">
                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <ArrowRightLeft className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">No transactions yet</h3>
                <p className="text-slate-500 max-w-sm mb-8 text-base">
                  You have not made any secure transactions matching these filters. Start buying or selling safely today!
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                  <Button onClick={() => router.push('/buyer/step-1')} className="w-full sm:w-auto h-12 rounded-xl px-8 text-base font-bold shadow-lg shadow-primary/20">Start as Buyer</Button>
                  <Button onClick={() => router.push('/seller/step-1')} variant="outline" className="w-full sm:w-auto h-12 rounded-xl px-8 text-base font-bold border-slate-200">Start as Seller</Button>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                      <TableRow className="border-none hover:bg-transparent">
                        <TableHead className="font-bold text-slate-600 h-14 px-6">Transaction ID</TableHead>
                        <TableHead className="font-bold text-slate-600">Product Details</TableHead>
                        <TableHead className="font-bold text-slate-600">Parties</TableHead>
                        <TableHead className="font-bold text-slate-600">Amount</TableHead>
                        <TableHead className="font-bold text-slate-600">Status</TableHead>
                        <TableHead className="font-bold text-slate-600 text-right px-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {sortedTransactions.map((txn, idx) => (
                          <motion.tr 
                            key={txn.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group"
                          >
                            <TableCell className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-slate-900 text-base">{txn.short_id}</span>
                                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mt-1.5">
                                  <Clock className="h-3.5 w-3.5" /> {format(new Date(txn.created_at), 'MMM d, yyyy')}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="font-bold text-slate-900 max-w-[250px] truncate text-base">{txn.product_name}</div>
                              <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 mt-2">
                                <ClipboardList className="h-3 w-3" />
                                {txn.platform || 'Direct'}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col gap-1.5">
                                <div className="text-sm flex items-center gap-2">
                                  <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-50 text-[10px] font-bold text-blue-600">B</span>
                                  <span className="font-medium text-slate-700">{txn.buyer_name || txn.buyer_phone}</span>
                                </div>
                                <div className="text-sm flex items-center gap-2">
                                  <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-50 text-[10px] font-bold text-emerald-600">S</span>
                                  <span className="font-medium text-slate-700">{txn.seller_name || txn.seller_phone}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <span className="font-black text-slate-900 text-lg">GHS {Number(txn.grand_total).toFixed(2)}</span>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge className={`${TRANSACTION_STATUSES[txn.status]?.color || 'bg-slate-100 text-slate-700'} rounded-full px-3 py-1 font-bold uppercase tracking-wider text-[10px]`}>
                                {TRANSACTION_STATUSES[txn.status]?.label || txn.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right px-6 py-4">
                              {getContinueAction(txn) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mr-2 h-9 rounded-xl font-bold border-slate-200"
                                  disabled={payingTxnId === txn.id}
                                  onClick={() => {
                                    const action = getContinueAction(txn)!;
                                    if (action.type === 'pay') {
                                      void handlePayNow(txn.id);
                                      return;
                                    }
                                    if (action.route) router.push(action.route);
                                  }}
                                >
                                  {payingTxnId === txn.id ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening...</> : getContinueAction(txn)!.label}
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all text-slate-400 hover:text-slate-900">
                                  <MoreHorizontal className="h-5 w-5" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-slate-100 p-1.5">
                                  <DropdownMenuItem onClick={() => router.push(`/tracking?q=${txn.short_id}`)} className="cursor-pointer py-2.5 px-3 rounded-lg font-medium text-slate-700">
                                    <Eye className="mr-2 h-4 w-4 text-slate-400" /> View Details
                                  </DropdownMenuItem>
                                  {role !== 'seller' && txn.status === 'SUBMITTED' && (
                                    <DropdownMenuItem onClick={() => void handlePayNow(txn.id)} className="cursor-pointer py-2.5 px-3 rounded-lg font-bold text-primary focus:bg-primary/5 focus:text-primary">
                                      <CheckCircle className="mr-2 h-4 w-4" /> Pay Now
                                    </DropdownMenuItem>
                                  )}
                                  {role !== 'buyer' && txn.status === 'PAID' && (
                                    <DropdownMenuItem onClick={() => router.push('/seller/step-1')} className="cursor-pointer py-2.5 px-3 rounded-lg font-bold text-primary focus:bg-primary/5 focus:text-primary">
                                      <Truck className="mr-2 h-4 w-4" /> Dispatch Order
                                    </DropdownMenuItem>
                                  )}
                                  {txn.status === 'DISPATCHED' && (
                                    <DropdownMenuItem onClick={() => router.push('/buyer/step-2')} className="cursor-pointer py-2.5 px-3 rounded-lg font-bold text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700">
                                      <CheckCircle className="mr-2 h-4 w-4" /> Confirm Delivery
                                    </DropdownMenuItem>
                                  )}
                                  {txn.status === 'DELIVERED_CONFIRMED' && role !== 'buyer' && (
                                    <DropdownMenuItem onClick={() => router.push('/seller/step-2')} className="cursor-pointer py-2.5 px-3 rounded-lg font-bold text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700">
                                      <Banknote className="mr-2 h-4 w-4" /> Collect Payout
                                    </DropdownMenuItem>
                                  )}
                                  <div className="h-px bg-slate-100 my-1.5"></div>
                                  <DropdownMenuItem onClick={() => router.push(`/hub?dispute=${txn.id}`)} className="cursor-pointer py-2.5 px-3 rounded-lg font-medium text-red-600 focus:bg-red-50 focus:text-red-700">
                                    <AlertCircle className="mr-2 h-4 w-4" /> Open Dispute
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-slate-100">
                  {sortedTransactions.map(txn => (
                    <div 
                      key={txn.id} 
                      className="px-4 py-5 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => router.push(`/tracking?q=${txn.short_id}`)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-900 text-base">{txn.short_id}</span>
                          <span className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {format(new Date(txn.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <Badge className={`${TRANSACTION_STATUSES[txn.status]?.color || 'bg-slate-100 text-slate-700'} rounded-full px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider`}>
                          {TRANSACTION_STATUSES[txn.status]?.label || txn.status}
                        </Badge>
                      </div>
                      <div className="mb-4 flex flex-col gap-2">
                        <p className="font-bold text-slate-900 text-base truncate">{txn.product_name}</p>
                        <div className="inline-flex self-start items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                          <ClipboardList className="h-3 w-3" />
                          {txn.platform || 'Direct'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                        <div className="text-sm text-slate-500 flex flex-col gap-1.5">
                          <span className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded bg-blue-50 text-[10px] font-bold text-blue-600">B</span> <span className="font-medium text-slate-700">{txn.buyer_name || txn.buyer_phone}</span></span>
                          <span className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-50 text-[10px] font-bold text-emerald-600">S</span> <span className="font-medium text-slate-700">{txn.seller_name || txn.seller_phone}</span></span>
                        </div>
                        <span className="font-black text-xl text-primary">GHS {Number(txn.grand_total).toFixed(2)}</span>
                      </div>
                      {getContinueAction(txn) && (
                        <Button
                          size="lg"
                          className="w-full mt-4 h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
                          disabled={payingTxnId === txn.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            const action = getContinueAction(txn)!;
                            if (action.type === 'pay') {
                              void handlePayNow(txn.id);
                              return;
                            }
                            if (action.route) router.push(action.route);
                          }}
                        >
                          {payingTxnId === txn.id ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening...</> : getContinueAction(txn)!.label}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-xl h-12 w-12 border-slate-200 shadow-sm hover:bg-slate-50"
                disabled={page <= 1} 
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-5 w-5 text-slate-600" />
              </Button>
              <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm font-semibold text-slate-600 text-sm">
                Page <span className="text-slate-900">{page}</span> of {totalPages}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-xl h-12 w-12 border-slate-200 shadow-sm hover:bg-slate-50"
                disabled={page >= totalPages} 
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-5 w-5 text-slate-600" />
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

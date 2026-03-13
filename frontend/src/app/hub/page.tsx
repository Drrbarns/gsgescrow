'use client';

import { useState, useEffect } from 'react';
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
  LayoutDashboard, Filter, ArrowRightLeft, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function HubPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [page, setPage] = useState(1);
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

  const totalPages = Math.ceil(total / limit);
  const role = profile?.role;

  if (authLoading) return null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      
      <main className="flex-1">
        {/* Premium Header Section */}
        <section className="bg-white pt-16 pb-32 relative overflow-hidden border-b border-slate-200">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-[20%] w-[30%] h-[30%] rounded-full bg-primary/5 blur-[100px]" />
            <div className="absolute bottom-0 left-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[100px]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:48px_48px]" />
          </div>
          
          <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600 border border-slate-200 mb-4 shadow-sm"
                >
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  <span>Control Center</span>
                </motion.div>
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-3xl font-black tracking-tight sm:text-4xl text-slate-900"
                >
                  Transaction Hub
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-2 text-slate-600 max-w-xl font-medium"
                >
                  Manage all your secure escrow payments, track deliveries, and release funds from one central dashboard.
                </motion.p>
              </div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-4 bg-white shadow-xl shadow-slate-200/50 border border-slate-100 rounded-2xl p-5"
              >
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Escrows</p>
                  <p className="text-3xl font-black text-slate-900">{total}</p>
                </div>
                <div className="w-px h-12 bg-slate-100 mx-2"></div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active</p>
                  <p className="text-3xl font-black text-primary">
                    {transactions.filter(t => !['COMPLETED', 'CANCELLED'].includes(t.status)).length}
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 relative z-20 -mt-20 pb-24">
          
          {/* Filters Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between"
          >
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input 
                placeholder="Search by ID, phone, or product..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 h-12 rounded-xl bg-slate-50 border-transparent focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
              />
            </div>
            
            <div className="flex w-full md:w-auto gap-3">
              <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(!v || v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 w-full md:w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="All Statuses" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(TRANSACTION_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              
              <Select value={platformFilter || 'all'} onValueChange={v => { setPlatformFilter(!v || v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 w-full md:w-[160px]">
                  <SelectValue placeholder="All Platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {SOURCE_PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Data Area */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden min-h-[400px]">
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
                <h3 className="text-xl font-bold text-slate-900 mb-2">No transactions yet</h3>
                <p className="text-slate-500 max-w-sm mb-8">
                  You haven't made any secure transactions matching these filters. Start buying or selling safely today!
                </p>
                <div className="flex gap-4">
                  <Button onClick={() => router.push('/buyer/step-1')} className="rounded-xl px-6">Start as Buyer</Button>
                  <Button onClick={() => router.push('/seller/step-1')} variant="outline" className="rounded-xl px-6">Start as Seller</Button>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-slate-100 hover:bg-slate-50/80">
                        <TableHead className="font-semibold text-slate-600 h-14">Transaction ID</TableHead>
                        <TableHead className="font-semibold text-slate-600">Product Details</TableHead>
                        <TableHead className="font-semibold text-slate-600">Parties</TableHead>
                        <TableHead className="font-semibold text-slate-600">Amount</TableHead>
                        <TableHead className="font-semibold text-slate-600">Status</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {transactions.map((txn, idx) => (
                          <motion.tr 
                            key={txn.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="border-slate-100 hover:bg-slate-50/50 transition-colors group"
                          >
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-slate-900">{txn.short_id}</span>
                                <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                  <Clock className="h-3 w-3" /> {format(new Date(txn.created_at), 'MMM d, yyyy')}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-slate-900 max-w-[200px] truncate">{txn.product_name}</div>
                              <div className="text-xs text-slate-500 mt-1">{txn.platform || 'Direct'}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <span className="text-slate-500">B:</span> <span className="font-medium">{txn.buyer_name || txn.buyer_phone}</span>
                              </div>
                              <div className="text-sm mt-0.5">
                                <span className="text-slate-500">S:</span> <span className="font-medium">{txn.seller_name || txn.seller_phone}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-slate-900">GHS {parseFloat(txn.grand_total).toFixed(2)}</span>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${TRANSACTION_STATUSES[txn.status]?.color || 'bg-slate-100 text-slate-700'} rounded-full px-3 py-1 font-semibold uppercase tracking-wider text-[10px]`}>
                                {TRANSACTION_STATUSES[txn.status]?.label || txn.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 hover:bg-accent hover:text-accent-foreground">
                                    <MoreHorizontal className="h-5 w-5 text-slate-400" />
                                  </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-slate-100">
                                  <DropdownMenuItem onClick={() => router.push(`/tracking?q=${txn.short_id}`)} className="cursor-pointer py-2.5">
                                    <Eye className="mr-2 h-4 w-4 text-slate-400" /> View Details
                                  </DropdownMenuItem>
                                  {role !== 'seller' && txn.status === 'SUBMITTED' && (
                                    <DropdownMenuItem onClick={() => router.push('/buyer/step-1')} className="cursor-pointer py-2.5 text-primary font-medium">
                                      <CheckCircle className="mr-2 h-4 w-4" /> Pay Now
                                    </DropdownMenuItem>
                                  )}
                                  {role !== 'buyer' && txn.status === 'PAID' && (
                                    <DropdownMenuItem onClick={() => router.push('/seller/step-1')} className="cursor-pointer py-2.5 text-primary font-medium">
                                      <Truck className="mr-2 h-4 w-4" /> Dispatch Order
                                    </DropdownMenuItem>
                                  )}
                                  {txn.status === 'DISPATCHED' && (
                                    <DropdownMenuItem onClick={() => router.push('/buyer/step-2')} className="cursor-pointer py-2.5 text-green-600 font-medium">
                                      <CheckCircle className="mr-2 h-4 w-4" /> Confirm Delivery
                                    </DropdownMenuItem>
                                  )}
                                  {txn.status === 'DELIVERED_CONFIRMED' && role !== 'buyer' && (
                                    <DropdownMenuItem onClick={() => router.push('/seller/step-2')} className="cursor-pointer py-2.5 text-green-600 font-medium">
                                      <Banknote className="mr-2 h-4 w-4" /> Collect Payout
                                    </DropdownMenuItem>
                                  )}
                                  <div className="h-px bg-slate-100 my-1"></div>
                                  <DropdownMenuItem onClick={() => router.push(`/hub?dispute=${txn.id}`)} className="cursor-pointer py-2.5 text-red-600">
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
                  {transactions.map(txn => (
                    <div 
                      key={txn.id} 
                      className="p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => router.push(`/tracking?q=${txn.short_id}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-900">{txn.short_id}</span>
                          <span className="text-xs text-slate-400 mt-0.5">{format(new Date(txn.created_at), 'MMM d, yyyy')}</span>
                        </div>
                        <Badge className={`${TRANSACTION_STATUSES[txn.status]?.color || 'bg-slate-100 text-slate-700'} rounded-full px-2.5 py-0.5 text-[10px] uppercase font-bold`}>
                          {TRANSACTION_STATUSES[txn.status]?.label || txn.status}
                        </Badge>
                      </div>
                      <p className="font-medium text-slate-900 truncate mb-3">{txn.product_name}</p>
                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                        <div className="text-xs text-slate-500 flex flex-col gap-1">
                          <span>B: <span className="font-medium text-slate-700">{txn.buyer_name || txn.buyer_phone}</span></span>
                          <span>S: <span className="font-medium text-slate-700">{txn.seller_name || txn.seller_phone}</span></span>
                        </div>
                        <span className="font-bold text-lg text-primary">GHS {parseFloat(txn.grand_total).toFixed(2)}</span>
                      </div>
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
                className="rounded-xl h-10 w-10 border-slate-200"
                disabled={page <= 1} 
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-5 w-5 text-slate-600" />
              </Button>
              <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm font-medium text-slate-600 text-sm">
                Page <span className="text-slate-900">{page}</span> of {totalPages}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-xl h-10 w-10 border-slate-200"
                disabled={page >= totalPages} 
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-5 w-5 text-slate-600" />
              </Button>
            </div>
          )}

        </section>
      </main>
      <Footer />
    </div>
  );
}

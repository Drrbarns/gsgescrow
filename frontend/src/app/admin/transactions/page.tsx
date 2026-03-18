'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { TRANSACTION_STATUSES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, MoreHorizontal, Eye, Flag, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminTransactions() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [flagDialog, setFlagDialog] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');

  useEffect(() => { fetchData(); }, [page, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchData() {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.listTransactions(params);
      setTransactions(res.data);
      setTotal(res.total);
    } catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }

  async function handleFlag() {
    if (!flagDialog || !flagReason) return;
    try {
      await api.flagTransaction(flagDialog, flagReason);
      toast.success('Transaction flagged');
      setFlagDialog(null);
      setFlagReason('');
      fetchData();
    } catch { toast.error('Failed to flag'); }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap gap-3 px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-1 min-w-0 w-full sm:w-auto gap-2">
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchData()} />
            <Button variant="secondary" onClick={fetchData} size="icon" className="shrink-0"><Search className="h-4 w-4" /></Button>
          </div>
          <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(!v || v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(TRANSACTION_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <Card>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map(txn => (
                <TableRow key={txn.id}>
                  <TableCell className="font-mono text-xs">{txn.short_id}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{txn.product_name}</TableCell>
                  <TableCell>{txn.buyer_name}</TableCell>
                  <TableCell>{txn.seller_name}</TableCell>
                  <TableCell className="font-medium">GHS {parseFloat(txn.grand_total).toFixed(2)}</TableCell>
                  <TableCell><Badge className={TRANSACTION_STATUSES[txn.status]?.color}>{TRANSACTION_STATUSES[txn.status]?.label}</Badge></TableCell>
                  <TableCell className="text-sm">{format(new Date(txn.created_at), 'dd MMM yy')}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/admin/transactions/${txn.id}`)}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFlagDialog(txn.id)} className="text-destructive"><Flag className="mr-2 h-4 w-4" /> Flag Suspicious</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}

      <Dialog open={!!flagDialog} onOpenChange={() => setFlagDialog(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader><DialogTitle>Flag Transaction</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason for flagging..." value={flagReason} onChange={e => setFlagReason(e.target.value)} />
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setFlagDialog(null)} className="w-full sm:w-auto">Cancel</Button>
            <Button variant="destructive" onClick={handleFlag} className="w-full sm:w-auto">Flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

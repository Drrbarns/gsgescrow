'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Pause, Play, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  QUEUED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800',
  SUCCESS: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  HELD: 'bg-amber-100 text-amber-800',
};

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [holdDialog, setHoldDialog] = useState<string | null>(null);
  const [holdReason, setHoldReason] = useState('');
  const [releaseConfirm, setReleaseConfirm] = useState<string | null>(null);
  const [retryConfirm, setRetryConfirm] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [page, statusFilter, typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchData() {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      const res = await api.listPayouts(params);
      setPayouts(res.data);
      setTotal(res.total);
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  }

  async function handleHold() {
    if (!holdDialog || !holdReason) { toast.error('Reason required'); return; }
    try {
      await api.holdPayout(holdDialog, holdReason);
      toast.success('Payout held');
      setHoldDialog(null); setHoldReason('');
      fetchData();
    } catch { toast.error('Failed'); }
  }

  async function handleRelease() {
    if (!releaseConfirm) return;
    try {
      await api.releasePayout(releaseConfirm);
      toast.success('Payout released');
      setReleaseConfirm(null);
      fetchData();
    } catch { toast.error('Failed'); }
  }

  async function handleRetry() {
    if (!retryConfirm) return;
    try {
      await api.retryPayout(retryConfirm);
      toast.success('Payout retried');
      setRetryConfirm(null);
      fetchData();
    } catch { toast.error('Failed'); }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap gap-3 px-3 py-3 sm:px-6 sm:py-4">
          <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(!v || v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {['PENDING', 'QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED', 'HELD'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter || 'all'} onValueChange={v => { setTypeFilter(!v || v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="RIDER">Rider</SelectItem>
              <SelectItem value="SELLER">Seller</SelectItem>
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
                <TableHead>Transaction</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.transactions?.short_id || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{p.type}</Badge></TableCell>
                  <TableCell className="font-medium">GHS {parseFloat(p.amount).toFixed(2)}</TableCell>
                  <TableCell><Badge className={statusColors[p.status]}>{p.status}</Badge></TableCell>
                  <TableCell>{p.attempts}/{p.max_attempts}</TableCell>
                  <TableCell className="text-sm">{format(new Date(p.created_at), 'dd MMM HH:mm')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {['PENDING', 'QUEUED', 'PROCESSING'].includes(p.status) && (
                        <Button variant="ghost" size="icon" title="Hold" onClick={() => setHoldDialog(p.id)}><Pause className="h-4 w-4" /></Button>
                      )}
                      {p.status === 'HELD' && (
                        <Button variant="ghost" size="icon" title="Release" onClick={() => setReleaseConfirm(p.id)}><Play className="h-4 w-4" /></Button>
                      )}
                      {p.status === 'FAILED' && (
                        <Button variant="ghost" size="icon" title="Retry" onClick={() => setRetryConfirm(p.id)}><RotateCcw className="h-4 w-4" /></Button>
                      )}
                    </div>
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

      {/* Hold Dialog */}
      <Dialog open={!!holdDialog} onOpenChange={() => setHoldDialog(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader><DialogTitle>Hold Payout</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason for holding (required)..." value={holdReason} onChange={e => setHoldReason(e.target.value)} />
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setHoldDialog(null)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleHold} className="w-full sm:w-auto">Hold Payout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Confirm */}
      <AlertDialog open={!!releaseConfirm} onOpenChange={() => setReleaseConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Release Payout?</AlertDialogTitle><AlertDialogDescription>This will re-queue the payout for processing.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleRelease}>Release</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Retry Confirm */}
      <AlertDialog open={!!retryConfirm} onOpenChange={() => setRetryConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Retry Payout?</AlertDialogTitle><AlertDialogDescription>This will reset attempts and re-queue the failed payout.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleRetry}>Retry</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

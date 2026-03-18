'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Loader2, Eye, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-gray-100 text-gray-800',
};

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<any>(null);
  const [resolveDialog, setResolveDialog] = useState<any>(null);
  const [resolution, setResolution] = useState('');
  const [resolutionAction, setResolutionAction] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => { fetchData(); }, [page, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchData() {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (statusFilter) params.status = statusFilter;
      const res = await api.listDisputes(params);
      setDisputes(res.data);
      setTotal(res.total);
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  }

  async function openDetail(id: string) {
    try {
      const { data } = await api.getDispute(id);
      setDetail(data);
    } catch { toast.error('Failed to load'); }
  }

  async function handleResolve() {
    if (!resolveDialog || !resolution || !resolutionAction) { toast.error('Fill all fields'); return; }
    try {
      await api.resolveDispute(resolveDialog.id, { resolution, resolution_action: resolutionAction, notes });
      toast.success('Dispute resolved');
      setResolveDialog(null);
      setResolution(''); setResolutionAction(''); setNotes('');
      fetchData();
    } catch { toast.error('Failed'); }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap gap-3 px-3 py-3 sm:px-6 sm:py-4">
          <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(!v || v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <div className="space-y-3">
          {disputes.map(d => (
            <Card key={d.id}>
              <CardContent className="px-3 py-3 sm:px-6 sm:py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={statusColors[d.status]}>{d.status}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">{d.transactions?.short_id}</span>
                    </div>
                    <p className="text-sm font-medium">{d.transactions?.product_name}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{d.reason}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(d.created_at), 'dd MMM yyyy HH:mm')}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(d.id)}><Eye className="h-4 w-4" /></Button>
                    {d.status !== 'RESOLVED' && d.status !== 'REJECTED' && (
                      <Button variant="outline" size="sm" onClick={() => setResolveDialog(d)}><CheckCircle className="h-4 w-4 mr-1" /> Resolve</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader><DialogTitle>Dispute Details</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Transaction</span><span>{detail.transactions?.short_id}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusColors[detail.status]}>{detail.status}</Badge></div>
                <div><span className="text-muted-foreground">Reason</span><p className="mt-1">{detail.reason}</p></div>
                {detail.resolution && <div><span className="text-muted-foreground">Resolution</span><p className="mt-1">{detail.resolution}</p></div>}
              </div>
              {detail.dispute_evidence?.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Evidence ({detail.dispute_evidence.length})</h4>
                    <div className="space-y-2">
                      {detail.dispute_evidence.map((e: any) => (
                        <div key={e.id} className="flex items-center justify-between rounded-lg bg-muted p-2 text-sm">
                          <span>{e.file_name}</span>
                          <span className="text-xs text-muted-foreground">{e.mime_type} &middot; {Math.round(e.file_size / 1024)}KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader><DialogTitle>Resolve Dispute</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Resolution *</Label>
              <Textarea value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Describe the resolution..." />
            </div>
            <div className="space-y-2">
              <Label>Action *</Label>
              <Select value={resolutionAction} onValueChange={v => setResolutionAction(v || '')}>
                <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="release">Release Funds to Seller</SelectItem>
                  <SelectItem value="refund">Refund Buyer</SelectItem>
                  <SelectItem value="hold">Continue Hold</SelectItem>
                  <SelectItem value="partial">Partial Resolution</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setResolveDialog(null)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleResolve} className="w-full sm:w-auto">Resolve Dispute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

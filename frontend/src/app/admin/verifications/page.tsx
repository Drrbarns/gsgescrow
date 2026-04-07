'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShieldCheck, CheckCircle, XCircle, Search, Eye, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminVerificationsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const isPrivileged = profile?.role === 'admin' || profile?.role === 'superadmin';

  useEffect(() => {
    if (!authLoading && (!user || !isPrivileged)) router.push('/login');
  }, [authLoading, user, profile, router, isPrivileged]);

  useEffect(() => {
    if (user && isPrivileged) {
      loadVerifications();
    }
  }, [user, profile, isPrivileged, roleFilter, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadVerifications() {
    setLoading(true);
    try {
      const res = await api.listAdminVerifications({
        role: roleFilter,
        status: statusFilter,
        search,
      });
      setVerifications(res.data || []);
    } catch {
      toast.error('Failed to load verifications');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    try {
      if (action === 'approve') {
        await api.approveAdminVerification(id, reviewNotes);
      } else {
        await api.rejectAdminVerification(id, rejectReason || 'Rejected by admin');
      }
      toast.success(`KYC ${action === 'approve' ? 'approved' : 'rejected'}`);
      setSelected(null);
      setReviewNotes('');
      setRejectReason('');
      await loadVerifications();
    } catch {
      toast.error('Action failed');
    }
  }

  async function handleStatusChange(id: string, status: 'UNDER_REVIEW' | 'REQUIRES_RESUBMISSION') {
    try {
      await api.updateAdminVerificationStatus(id, status, status === 'REQUIRES_RESUBMISSION' ? (rejectReason || 'Please resubmit clearer docs') : undefined, reviewNotes || undefined);
      toast.success('KYC status updated');
      await loadVerifications();
    } catch {
      toast.error('Failed to update status');
    }
  }

  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    UNDER_REVIEW: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    REQUIRES_RESUBMISSION: 'bg-orange-100 text-orange-800',
  };

  const filtered = verifications.filter((v) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(v.full_name || '').toLowerCase().includes(q) ||
      String(v.id_number || '').toLowerCase().includes(q) ||
      String(v.phone || '').toLowerCase().includes(q)
    );
  });

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-1 sm:py-2">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Buyer & Seller KYC Control
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Review, approve, reject, and route KYC requests with full admin control.</p>
        </div>

        <Card className="mb-5 rounded-2xl">
          <CardContent className="pt-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID number, phone..." />
              </div>
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v || 'all')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="buyer">Buyer KYC</SelectItem>
                  <SelectItem value="seller">Seller KYC</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'all')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under review</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="REQUIRES_RESUBMISSION">Resubmission</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3">
              <Button onClick={() => void loadVerifications()}>Apply Filters</Button>
            </div>
          </CardContent>
        </Card>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{verifications.length}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold">{verifications.filter((v) => v.status === 'PENDING').length}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold">{verifications.filter((v) => v.status === 'APPROVED').length}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Resubmission</p><p className="text-2xl font-bold">{verifications.filter((v) => v.status === 'REQUIRES_RESUBMISSION').length}</p></CardContent></Card>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl text-center py-16">
            <ShieldCheck className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold">No Verification Requests</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map(v => (
              <Card key={v.id} className="rounded-2xl">
                <CardContent className="px-3 py-3 sm:px-6 sm:py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold">{v.full_name}</span>
                        <Badge variant="outline" className="uppercase">{v.user_role}</Badge>
                        <Badge className={statusColors[v.status] || ''}>{v.status}</Badge>
                        {v.id_type && <Badge variant="secondary">{v.id_type}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                        {v.id_number && <p>ID Number: {v.id_number}</p>}
                        {v.tax_number && <p>Tax Number: {v.tax_number}</p>}
                        <p>Phone: {v.phone || 'N/A'}</p>
                        <p>Address: {v.address || 'N/A'}</p>
                        <p>Submitted: {new Date(v.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                      <Button size="sm" variant="outline" onClick={() => setSelected(v)} className="rounded-full gap-1 flex-1 sm:flex-initial">
                        <Eye className="h-3.5 w-3.5" /> Review
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>KYC Review Panel</DialogTitle>
          </DialogHeader>
          {!selected ? null : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Card><CardContent className="pt-4 space-y-1 text-sm"><p><span className="font-semibold">Name:</span> {selected.full_name}</p><p><span className="font-semibold">Role:</span> {selected.user_role}</p><p><span className="font-semibold">ID:</span> {selected.id_number || 'N/A'}</p></CardContent></Card>
                <Card><CardContent className="pt-4 space-y-1 text-sm"><p><span className="font-semibold">Address:</span> {selected.address || 'N/A'}</p><p><span className="font-semibold">Phone:</span> {selected.phone || 'N/A'}</p><p><span className="font-semibold">Status:</span> {selected.status}</p></CardContent></Card>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Reviewer Notes</p>
                <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Internal notes for this review..." />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Rejection / Resubmission Reason</p>
                <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason shown to the user if rejected or sent back..." />
              </div>
              <DialogFooter className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void handleStatusChange(selected.id, 'UNDER_REVIEW')}>
                  <ShieldAlert className="mr-1 h-4 w-4" /> Mark Under Review
                </Button>
                <Button variant="outline" onClick={() => void handleStatusChange(selected.id, 'REQUIRES_RESUBMISSION')}>
                  Request Resubmission
                </Button>
                <Button variant="destructive" onClick={() => void handleAction(selected.id, 'reject')}>
                  <XCircle className="mr-1 h-4 w-4" /> Reject
                </Button>
                <Button onClick={() => void handleAction(selected.id, 'approve')}>
                  <CheckCircle className="mr-1 h-4 w-4" /> Approve
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

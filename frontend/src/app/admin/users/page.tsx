'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, UserCog, LogIn, Shield, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const router = useRouter();
  const { baseProfile, startImpersonation } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [impersonationReason, setImpersonationReason] = useState('');
  const [impersonating, setImpersonating] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;

  const isSuperadmin = baseProfile?.role === 'superadmin';

  useEffect(() => {
    void loadUsers();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await api.getAdminUsers({
        page: String(page),
        limit: String(pageSize),
        role: roleFilter,
        search,
      });
      setUsers(res.data || []);
      setTotal(res.total || 0);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  const roleCounts = users.reduce((acc: Record<string, number>, u: any) => {
    const role = u.role || 'unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function openDetails(userId: string) {
    setDetailsLoading(true);
    setSelectedDetails(null);
    try {
      const res = await api.getAdminUserDetails(userId);
      setSelectedDetails(res.data);
    } catch {
      toast.error('Failed to load user details');
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleRoleChange(nextRole: 'buyer' | 'seller' | 'admin' | 'superadmin') {
    if (!selectedUser) return;
    setRoleUpdating(true);
    try {
      await api.updateAdminUserRole(selectedUser.user_id, nextRole);
      toast.success('User role updated');
      setSelectedUser({ ...selectedUser, role: nextRole });
      await loadUsers();
    } catch {
      toast.error('Failed to update role');
    } finally {
      setRoleUpdating(false);
    }
  }

  async function handleImpersonationStart() {
    if (!selectedUser) return;
    if (!impersonationReason.trim()) {
      toast.error('Please enter a reason before impersonating');
      return;
    }
    setImpersonating(true);
    try {
      const result = await startImpersonation(selectedUser.user_id, impersonationReason.trim(), 30);
      if (result.error) throw result.error;
      toast.success('Impersonation started');
      router.push('/hub');
    } catch {
      toast.error('Failed to start impersonation');
    } finally {
      setImpersonating(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Directory Total</p>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Buyers</p>
            <p className="text-2xl font-bold">{roleCounts.buyer || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Sellers</p>
            <p className="text-2xl font-bold">{roleCounts.seller || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Privileged</p>
            <p className="text-2xl font-bold">{(roleCounts.admin || 0) + (roleCounts.superadmin || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCog className="h-5 w-5 text-primary" />
            Customer & Seller Directory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone"
                className="pl-9"
                onKeyDown={(e) => e.key === 'Enter' && void loadUsers()}
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v || 'all')}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="buyer">Buyers</SelectItem>
                <SelectItem value="seller">Sellers</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="superadmin">Superadmins</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { setPage(1); void loadUsers(); }} className="md:w-auto">
              Apply
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading users...
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {users.map((u) => (
                <button
                  key={u.user_id}
                  type="button"
                  onClick={() => {
                    setSelectedUser(u);
                    void openDetails(u.user_id);
                  }}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900 truncate">{u.full_name || 'Unnamed user'}</p>
                    <Badge variant="secondary" className="uppercase">{u.role}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{u.phone || 'No phone'}</p>
                  <p className="mt-2 text-xs text-slate-400">User ID: {u.user_id}</p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Users className="h-4 w-4" /> Page {page} of {totalPages}
        </p>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>User Control Panel</DialogTitle>
          </DialogHeader>

          {!selectedUser ? null : (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <Card className="md:col-span-2">
                  <CardContent className="pt-4">
                    <p className="text-xs uppercase text-slate-500 font-semibold">Identity</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{selectedUser.full_name || 'Unnamed user'}</p>
                    <p className="text-sm text-slate-600">{selectedUser.phone || 'No phone'}</p>
                    <p className="text-xs text-slate-400 mt-1">{selectedUser.user_id}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-xs uppercase text-slate-500 font-semibold">Role</p>
                    <Select
                      value={selectedUser.role}
                      onValueChange={(v) => void handleRoleChange(v as 'buyer' | 'seller' | 'admin' | 'superadmin')}
                      disabled={!isSuperadmin || roleUpdating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buyer">buyer</SelectItem>
                        <SelectItem value="seller">seller</SelectItem>
                        <SelectItem value="admin">admin</SelectItem>
                        <SelectItem value="superadmin">superadmin</SelectItem>
                      </SelectContent>
                    </Select>
                    {!isSuperadmin && <p className="text-[11px] text-slate-500">Only superadmin can change roles.</p>}
                  </CardContent>
                </Card>
              </div>

              {isSuperadmin && (
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 font-semibold">
                      <Shield className="h-4 w-4 text-primary" />
                      Secure Impersonation
                    </div>
                    <div className="space-y-1">
                      <Label>Reason (required)</Label>
                      <Textarea
                        value={impersonationReason}
                        onChange={(e) => setImpersonationReason(e.target.value)}
                        placeholder="Why are you impersonating this account?"
                      />
                    </div>
                    <Button
                      className="gap-2"
                      onClick={() => void handleImpersonationStart()}
                      disabled={impersonating || selectedUser.role === 'superadmin'}
                    >
                      {impersonating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                      Login as this user
                    </Button>
                    {selectedUser.role === 'superadmin' && (
                      <p className="text-xs text-red-600">Impersonating another superadmin is blocked.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Profile Snapshot</CardTitle>
                </CardHeader>
                <CardContent>
                  {detailsLoading ? (
                    <div className="text-sm text-slate-500 flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading details...
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs uppercase text-slate-500">Transactions</p>
                        <p className="text-xl font-bold">{selectedDetails?.aggregates?.total_transactions || 0}</p>
                        <p className="text-xs text-slate-500">Completed: {selectedDetails?.aggregates?.completed_transactions || 0}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs uppercase text-slate-500">Volume</p>
                        <p className="text-xl font-bold">GHS {Number(selectedDetails?.aggregates?.total_volume_ghs || 0).toFixed(2)}</p>
                        <p className="text-xs text-slate-500">Disputes: {selectedDetails?.aggregates?.disputes_opened || 0}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


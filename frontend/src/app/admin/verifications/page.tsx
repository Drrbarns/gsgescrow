'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminVerificationsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'admin')) router.push('/login');
  }, [authLoading, user, profile, router]);

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      loadVerifications();
    }
  }, [user, profile]);

  async function loadVerifications() {
    try {
      const res = await api.request<{ data: any[] }>('/api/admin/verifications');
      setVerifications(res.data || []);
    } catch {
      toast.error('Failed to load verifications');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    try {
      await api.request(`/api/admin/verifications/${id}/${action}`, { method: 'POST' });
      toast.success(`Verification ${action === 'approve' ? 'approved' : 'rejected'}`);
      loadVerifications();
    } catch {
      toast.error('Action failed');
    }
  }

  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Seller Verifications
          </h1>
          <p className="text-muted-foreground">Review and manage seller verification requests.</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        ) : verifications.length === 0 ? (
          <Card className="rounded-2xl text-center py-16">
            <ShieldCheck className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold">No Verification Requests</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {verifications.map(v => (
              <Card key={v.id} className="rounded-2xl">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">{v.business_name}</span>
                        <Badge className={statusColors[v.status] || ''}>{v.status}</Badge>
                        {v.business_type && <Badge variant="secondary">{v.business_type}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                        {v.ghana_card_number && <p>Ghana Card: {v.ghana_card_number}</p>}
                        {v.tin_number && <p>TIN: {v.tin_number}</p>}
                        <p>Location: {v.business_location}</p>
                        <p>Submitted: {new Date(v.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {v.status === 'PENDING' && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => handleAction(v.id, 'reject')} className="rounded-full gap-1 border-red-200 text-red-700 hover:bg-red-50">
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                        <Button size="sm" onClick={() => handleAction(v.id, 'approve')} className="rounded-full gap-1">
                          <CheckCircle className="h-3.5 w-3.5" /> Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

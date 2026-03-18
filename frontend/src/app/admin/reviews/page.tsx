'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await api.listReviews();
      setReviews(res.data);
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  }

  async function handleModerate(id: string, status: string) {
    try {
      await api.moderateReview(id, status);
      toast.success(`Review ${status.toLowerCase()}`);
      setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch { toast.error('Failed'); }
  }

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map(r => (
          <Card key={r.id}>
            <CardContent className="px-3 pt-3 sm:px-6 sm:pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={`h-4 w-4 ${n <= (r.seller_rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
                <Badge variant={r.status === 'APPROVED' ? 'default' : r.status === 'REJECTED' ? 'destructive' : 'secondary'}>{r.status}</Badge>
              </div>
              <p className="text-sm font-medium">{r.transactions?.product_name || 'Product'}</p>
              <p className="text-sm text-muted-foreground line-clamp-3">{r.comment || 'No comment'}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{r.transactions?.seller_name}</span>
                <span>{format(new Date(r.created_at), 'dd MMM yyyy')}</span>
              </div>
              {r.status === 'PENDING' && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => handleModerate(r.id, 'APPROVED')}>
                    <Check className="h-3 w-3" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-destructive" onClick={() => handleModerate(r.id, 'REJECTED')}>
                    <X className="h-3 w-3" /> Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {reviews.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">No reviews to moderate.</CardContent></Card>}
    </div>
  );
}

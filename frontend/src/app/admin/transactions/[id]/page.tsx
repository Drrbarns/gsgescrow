'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { TRANSACTION_STATUSES } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Flag, AlertTriangle, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function TransactionDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [txn, setTxn] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.getTransaction(id as string)
        .then(res => setTxn(res.data))
        .catch(() => toast.error('Failed to load'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>;
  if (!txn) return <p className="text-muted-foreground">Transaction not found.</p>;

  const statusInfo = TRANSACTION_STATUSES[txn.status] || { label: txn.status, color: '' };

  const timeline = [
    { label: 'Created', date: txn.created_at },
    { label: 'Paid', date: txn.paid_at },
    { label: 'Dispatched', date: txn.dispatched_at },
    { label: 'Delivered', date: txn.delivered_at },
    { label: 'Completed', date: txn.completed_at },
  ];

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{txn.short_id}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{txn.product_name}</p>
        </div>
        <Badge className={`${statusInfo.color} text-sm px-3 py-1 self-start sm:self-auto`}>{statusInfo.label}</Badge>
      </div>

      {/* Details Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Buyer Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{txn.buyer_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{txn.buyer_phone}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery Address</span><span className="text-right max-w-[200px]">{txn.delivery_address}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Seller Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{txn.seller_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{txn.seller_phone}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Rider</span><span>{txn.rider_name || 'N/A'} ({txn.rider_phone || 'N/A'})</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Financial */}
      <Card>
        <CardHeader><CardTitle className="text-base">Financial Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Product Total</span><span>GHS {parseFloat(txn.product_total).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Delivery Fee</span><span>GHS {parseFloat(txn.delivery_fee).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Rider Release (PSP Fee)</span><span>GHS {parseFloat(txn.rider_release_fee).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Buyer Platform Fee</span><span>GHS {parseFloat(txn.buyer_platform_fee).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Seller Platform Fee</span><span>GHS {parseFloat(txn.seller_platform_fee).toFixed(2)}</span></div>
          <Separator />
          <div className="flex justify-between font-bold"><span>Grand Total</span><span>GHS {parseFloat(txn.grand_total).toFixed(2)}</span></div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {timeline.map((step, i) => (
              <div key={step.label} className="flex flex-col items-center min-w-[100px]">
                <div className={`h-3 w-3 rounded-full ${step.date ? 'bg-primary' : 'bg-muted'}`} />
                {i < timeline.length - 1 && <div className={`h-0.5 w-16 my-1 ${step.date ? 'bg-primary' : 'bg-muted'}`} />}
                <span className="text-xs font-medium mt-1">{step.label}</span>
                <span className="text-xs text-muted-foreground">{step.date ? format(new Date(step.date), 'dd MMM HH:mm') : '—'}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ledger */}
      {txn.ledger_entries?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Ledger Entries</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Bucket</TableHead><TableHead>Direction</TableHead><TableHead>Amount</TableHead><TableHead>Ref</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {txn.ledger_entries.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell><Badge variant="secondary">{e.bucket}</Badge></TableCell>
                    <TableCell className={e.direction === 'CREDIT' ? 'text-green-600' : 'text-red-600'}>{e.direction}</TableCell>
                    <TableCell>GHS {parseFloat(e.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.ref}</TableCell>
                    <TableCell className="text-xs">{format(new Date(e.created_at), 'dd MMM HH:mm')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payouts */}
      {txn.payouts?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Payouts</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Attempts</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {txn.payouts.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell><Badge variant="outline">{p.type}</Badge></TableCell>
                    <TableCell>GHS {parseFloat(p.amount).toFixed(2)}</TableCell>
                    <TableCell><Badge variant={p.status === 'SUCCESS' ? 'default' : 'destructive'}>{p.status}</Badge></TableCell>
                    <TableCell>{p.attempts}</TableCell>
                    <TableCell className="text-xs">{format(new Date(p.created_at), 'dd MMM HH:mm')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={async () => { await api.flagTransaction(txn.id, 'Admin review'); toast.success('Flagged'); }}>
          <Flag className="h-4 w-4" /> Flag
        </Button>
        <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => router.push(`/admin/disputes?txn=${txn.id}`)}>
          <AlertTriangle className="h-4 w-4" /> Disputes
        </Button>
      </div>
    </div>
  );
}

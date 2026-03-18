'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Loader2, Download, FileBarChart } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminReports() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  async function fetchReport() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const { data } = await api.getFinanceReport(params);
      setReport(data);
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  }

  function exportCsv() {
    if (!report?.transactions?.length) return;
    const headers = ['Short ID', 'Buyer', 'Seller', 'Product Total', 'Delivery Fee', 'Buyer Fee', 'Seller Fee', 'Grand Total', 'Status', 'Created'];
    const rows = report.transactions.map((t: any) => [
      t.short_id, t.buyer_name, t.seller_name, t.product_total, t.delivery_fee,
      t.buyer_platform_fee, t.seller_platform_fee, t.grand_total, t.status, t.created_at,
    ]);
    const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-report-${dateFrom || 'all'}-${dateTo || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalCollected = report?.transactions?.reduce((s: number, t: any) => s + parseFloat(t.grand_total || 0), 0) || 0;
  const totalPaidOut = report?.payouts?.filter((p: any) => p.status === 'SUCCESS').reduce((s: number, p: any) => s + parseFloat(p.amount || 0), 0) || 0;
  const totalFees = report?.transactions?.reduce((s: number, t: any) => s + parseFloat(t.buyer_platform_fee || 0) + parseFloat(t.seller_platform_fee || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap gap-3 sm:gap-4 items-end px-3 py-3 sm:px-6 sm:py-4">
          <div className="space-y-1 w-full sm:w-auto">
            <Label className="text-xs">From</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full sm:w-44" />
          </div>
          <div className="space-y-1 w-full sm:w-auto">
            <Label className="text-xs">To</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full sm:w-44" />
          </div>
          <Button onClick={fetchReport} disabled={loading} className="gap-2 w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBarChart className="h-4 w-4" />} Generate Report
          </Button>
          {report && (
            <Button variant="outline" onClick={exportCsv} className="gap-2 w-full sm:w-auto"><Download className="h-4 w-4" /> Export CSV</Button>
          )}
        </CardContent>
      </Card>

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Collected</CardTitle></CardHeader>
              <CardContent><p className="text-xl sm:text-2xl font-bold">GHS {totalCollected.toFixed(2)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Paid Out</CardTitle></CardHeader>
              <CardContent><p className="text-xl sm:text-2xl font-bold">GHS {totalPaidOut.toFixed(2)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Net Revenue (Fees)</CardTitle></CardHeader>
              <CardContent><p className="text-xl sm:text-2xl font-bold text-primary">GHS {totalFees.toFixed(2)}</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Transactions ({report.transactions?.length || 0})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Product Total</TableHead>
                    <TableHead>Fees</TableHead>
                    <TableHead>Grand Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(report.transactions || []).slice(0, 50).map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.short_id}</TableCell>
                      <TableCell>{t.buyer_name}</TableCell>
                      <TableCell>{t.seller_name}</TableCell>
                      <TableCell>GHS {parseFloat(t.product_total).toFixed(2)}</TableCell>
                      <TableCell>GHS {(parseFloat(t.buyer_platform_fee) + parseFloat(t.seller_platform_fee)).toFixed(2)}</TableCell>
                      <TableCell className="font-medium">GHS {parseFloat(t.grand_total).toFixed(2)}</TableCell>
                      <TableCell>{t.status}</TableCell>
                      <TableCell className="text-xs">{format(new Date(t.created_at), 'dd MMM yy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

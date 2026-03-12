'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeftRight, Banknote, AlertTriangle, TrendingUp, ShieldAlert, ShieldCheck, Download, FileText, Users, Activity } from 'lucide-react';
import Link from 'next/link';
import { exportToCSV } from '@/lib/export';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(res => setData(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleExport(type: string) {
    try {
      const res = await api.request<{ data: any[] }>(`/api/admin/export/${type}`);
      exportToCSV(res.data, type);
      toast.success(`${type} exported successfully`);
    } catch {
      toast.error('Export failed');
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Transactions',
      value: data?.transactions?.total || 0,
      icon: ArrowLeftRight,
      color: 'text-blue-600 bg-blue-100',
      sub: `${data?.transactions?.by_status?.COMPLETED || 0} completed`,
      href: '/admin/transactions',
    },
    {
      label: 'Total Payouts',
      value: `GHS ${(data?.payouts?.total_amount || 0).toFixed(2)}`,
      icon: Banknote,
      color: 'text-green-600 bg-green-100',
      sub: `${data?.payouts?.total || 0} payouts (${data?.payouts?.by_status?.FAILED || 0} failed)`,
      href: '/admin/payouts',
    },
    {
      label: 'Active Disputes',
      value: (data?.disputes?.by_status?.OPEN || 0) + (data?.disputes?.by_status?.UNDER_REVIEW || 0),
      icon: AlertTriangle,
      color: 'text-orange-600 bg-orange-100',
      sub: `${data?.disputes?.total || 0} total disputes`,
      href: '/admin/disputes',
    },
    {
      label: 'Platform Revenue',
      value: `GHS ${(data?.revenue?.total_platform_fees || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-100',
      sub: 'Total platform fees collected',
      href: '/admin/reports',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(kpi => (
          <Link key={kpi.label} href={kpi.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.color}`}>
                  <kpi.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Status Breakdown */}
      {data?.transactions?.by_status && (
        <Card>
          <CardHeader><CardTitle className="text-base">Transaction Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.transactions.by_status).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm">
                  <span className="font-medium">{status}</span>
                  <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-bold">{count as number}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/fraud">
          <Card className="group cursor-pointer rounded-xl border-red-200 hover:border-red-400 transition-colors bg-red-50/50 hover:bg-red-50">
            <CardContent className="flex items-center gap-3 py-4">
              <ShieldAlert className="h-8 w-8 text-red-500" />
              <div>
                <p className="font-semibold text-sm">Fraud Monitor</p>
                <p className="text-xs text-muted-foreground">Review flagged transactions</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/verifications">
          <Card className="group cursor-pointer rounded-xl border-blue-200 hover:border-blue-400 transition-colors bg-blue-50/50 hover:bg-blue-50">
            <CardContent className="flex items-center gap-3 py-4">
              <ShieldCheck className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-semibold text-sm">Seller Verifications</p>
                <p className="text-xs text-muted-foreground">Approve / reject requests</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/disputes">
          <Card className="group cursor-pointer rounded-xl border-orange-200 hover:border-orange-400 transition-colors bg-orange-50/50 hover:bg-orange-50">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-semibold text-sm">Active Disputes</p>
                <p className="text-xs text-muted-foreground">Mediate and resolve</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/reports">
          <Card className="group cursor-pointer rounded-xl border-green-200 hover:border-green-400 transition-colors bg-green-50/50 hover:bg-green-50">
            <CardContent className="flex items-center gap-3 py-4">
              <FileText className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-semibold text-sm">Finance Reports</p>
                <p className="text-xs text-muted-foreground">Revenue & payout reports</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Export Actions */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4" /> Quick Exports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('transactions')} className="rounded-full gap-1.5">
              <Download className="h-3.5 w-3.5" /> Transactions CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('payouts')} className="rounded-full gap-1.5">
              <Download className="h-3.5 w-3.5" /> Payouts CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('disputes')} className="rounded-full gap-1.5">
              <Download className="h-3.5 w-3.5" /> Disputes CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

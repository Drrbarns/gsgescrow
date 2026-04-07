'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeftRight, Banknote, AlertTriangle, TrendingUp, ShieldAlert, ShieldCheck, Download, FileText, Users, Activity, Gauge, RefreshCw, Clock3 } from 'lucide-react';
import Link from 'next/link';
import { exportToCSV } from '@/lib/export';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sessions, setSessions] = useState<{ impersonations: any[]; admin_sessions: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function loadDashboardData() {
    await Promise.all([
      api.getDashboard().then(res => setData(res.data)),
      api.getAdminAnalyticsOverview().then(res => setAnalytics(res.data)),
      api.getAlertEvents('OPEN').then(res => setAlerts(res.data || [])),
      api.getAdminSessions().then(res => setSessions(res.data || null)),
    ]);
    setLastUpdated(new Date());
  }

  useEffect(() => {
    Promise.all([
      loadDashboardData(),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      void loadDashboardData();
    }, 20000);
    return () => window.clearInterval(timer);
  }, [autoRefresh]);

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

  const payoutFailurePenalty = Math.min(Number(analytics?.payout_failure_rate_percent || 0), 40);
  const disputePenalty = Math.min(Number(analytics?.dispute_rate_percent || 0), 35);
  const alertPenalty = Math.min(Number(analytics?.open_alerts || 0) * 2, 25);
  const healthScore = Math.max(0, Math.round(100 - payoutFailurePenalty - disputePenalty - alertPenalty));

  const alertItems = (alerts || []).slice(0, 5).map((a: any) => ({
    id: `alert-${a.id}`,
    label: a.title || 'Alert event',
    timestamp: a.created_at || a.acknowledged_at || new Date().toISOString(),
    type: 'alert',
  }));
  const impersonationItems = (sessions?.impersonations || []).slice(0, 5).map((s: any) => ({
    id: `imp-${s.id}`,
    label: `Impersonation ${s.status || 'UNKNOWN'} (${s.reason || 'No reason'})`,
    timestamp: s.started_at || s.ended_at || new Date().toISOString(),
    type: 'impersonation',
  }));
  const liveFeed = [...alertItems, ...impersonationItems]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

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
      <Card className="overflow-hidden rounded-2xl border-0 bg-gradient-to-r from-slate-900 via-slate-800 to-primary text-white shadow-lg">
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Superadmin Control Plane</p>
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-emerald-300" />
              <p className="text-2xl font-bold">{healthScore}% health score</p>
            </div>
            <p className="text-xs text-white/75">Unified oversight across users, payouts, disputes, fraud, and impersonation activity.</p>
            <Progress value={healthScore} className="h-2 w-64 max-w-full bg-white/20" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              <Label className="text-white">Auto refresh</Label>
            </div>
            <Button variant="secondary" size="sm" className="gap-2 bg-white text-slate-900 hover:bg-white/90" onClick={() => void loadDashboardData()}>
              <RefreshCw className="h-4 w-4" /> Refresh now
            </Button>
            <p className="text-xs text-white/80">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Awaiting first sync'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(kpi => (
          <Link key={kpi.label} href={kpi.href}>
            <Card className="cursor-pointer rounded-2xl border-slate-200/80 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.color}`}>
                  <kpi.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xl sm:text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Status Breakdown */}
      {data?.transactions?.by_status && (
        <Card className="rounded-2xl border-slate-200/80 shadow-sm">
          <CardHeader><CardTitle className="text-base">Transaction Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.transactions.by_status).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 rounded-full border bg-slate-50 px-3 py-1.5 text-sm">
                  <span className="font-medium">{status}</span>
                  <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-bold">{count as number}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link href="/admin/users">
          <Card className="group cursor-pointer rounded-2xl border-violet-200 hover:border-violet-400 transition-colors bg-violet-50/60 shadow-sm hover:shadow">
            <CardContent className="flex items-center gap-3 py-4">
              <Users className="h-8 w-8 text-violet-500" />
              <div>
                <p className="font-semibold text-sm">Users Directory</p>
                <p className="text-xs text-muted-foreground">Customers, sellers, admins</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/fraud">
          <Card className="group cursor-pointer rounded-2xl border-red-200 hover:border-red-400 transition-colors bg-red-50/60 shadow-sm hover:shadow">
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
          <Card className="group cursor-pointer rounded-2xl border-blue-200 hover:border-blue-400 transition-colors bg-blue-50/60 shadow-sm hover:shadow">
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
          <Card className="group cursor-pointer rounded-2xl border-orange-200 hover:border-orange-400 transition-colors bg-orange-50/60 shadow-sm hover:shadow">
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
          <Card className="group cursor-pointer rounded-2xl border-green-200 hover:border-green-400 transition-colors bg-green-50/60 shadow-sm hover:shadow">
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> God-Level Ops Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-slate-50 p-3">
              <p className="text-xs text-muted-foreground">GMV</p>
              <p className="text-xl font-bold">GHS {Number(analytics?.gmv || 0).toFixed(2)}</p>
            </div>
            <div className="rounded-xl border bg-slate-50 p-3">
              <p className="text-xs text-muted-foreground">Escrow Held</p>
              <p className="text-xl font-bold">GHS {Number(analytics?.escrow_held_value || 0).toFixed(2)}</p>
            </div>
            <div className="rounded-xl border bg-slate-50 p-3">
              <p className="text-xs text-muted-foreground">Dispute Rate</p>
              <p className="text-xl font-bold">{Number(analytics?.dispute_rate_percent || 0).toFixed(2)}%</p>
            </div>
            <div className="rounded-xl border bg-slate-50 p-3">
              <p className="text-xs text-muted-foreground">Payout Failure Rate</p>
              <p className="text-xl font-bold">{Number(analytics?.payout_failure_rate_percent || 0).toFixed(2)}%</p>
            </div>
            <div className="rounded-xl border bg-slate-50 p-3">
              <p className="text-xs text-muted-foreground">Avg Dispute Resolution</p>
              <p className="text-xl font-bold">{Number(analytics?.avg_dispute_resolution_hours || 0).toFixed(2)}h</p>
            </div>
            <div className="rounded-xl border bg-slate-50 p-3">
              <p className="text-xs text-muted-foreground">Open Alerts</p>
              <p className="text-xl font-bold text-red-600">{Number(analytics?.open_alerts || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">Live Superadmin Feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-xl border bg-slate-50 p-3">
              <p className="text-xs text-muted-foreground">Active impersonations</p>
              <p className="text-lg font-bold">{sessions?.impersonations?.filter(s => s.status === 'ACTIVE').length || 0}</p>
            </div>
            <div className="rounded-xl border bg-slate-50 p-3">
              <p className="text-xs text-muted-foreground">Open alert events</p>
              <p className="text-lg font-bold">{alerts.length}</p>
            </div>
            <div className="rounded-xl border bg-slate-50 p-3">
              <p className="text-xs text-muted-foreground">Admin sessions (24h)</p>
              <p className="text-lg font-bold">{sessions?.admin_sessions?.length || 0}</p>
            </div>
            <Link href="/admin/reports" className="block">
              <Button variant="outline" className="w-full">Open Reports & Alert Console</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Export Actions */}
      <Card className="rounded-2xl border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base flex items-center gap-2"><Download className="h-4 w-4" /> Quick Exports</CardTitle>
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

      <Card className="rounded-2xl border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Clock3 className="h-4 w-4" /> Recent Ops Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {liveFeed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent operations yet.</p>
          ) : (
            liveFeed.map((item) => (
              <div key={item.id} className="rounded-xl border bg-slate-50 p-3">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  {item.type.toUpperCase()} • {new Date(item.timestamp).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

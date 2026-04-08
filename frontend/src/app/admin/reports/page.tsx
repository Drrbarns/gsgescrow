'use client';

import { useEffect, useState } from 'react';
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
  const [alertRules, setAlertRules] = useState<any[]>([]);
  const [alertEvents, setAlertEvents] = useState<any[]>([]);
  const [exportJobs, setExportJobs] = useState<any[]>([]);
  const [reliability, setReliability] = useState<any>(null);
  const [opsLogs, setOpsLogs] = useState<any[]>([]);
  const [logLevelFilter, setLogLevelFilter] = useState('error');
  const [logTagFilter, setLogTagFilter] = useState('');
  const [alertStatusFilter, setAlertStatusFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    void loadOpsData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadOpsData() {
    try {
      const [rulesRes, eventsRes, jobsRes] = await Promise.all([
        api.getAlertRules(),
        api.getAlertEvents(alertStatusFilter),
        api.getExportJobs({ page: '1', limit: '20' }),
      ]);
      const [reliabilityRes, logsRes] = await Promise.all([
        api.getOpsReliabilityOverview(),
        api.getOpsRuntimeLogs({ level: logLevelFilter, tag: logTagFilter, limit: '50' }),
      ]);
      setAlertRules(rulesRes.data || []);
      setAlertEvents(eventsRes.data || []);
      setExportJobs(jobsRes.data || []);
      setReliability(reliabilityRes.data || null);
      setOpsLogs(logsRes.data || []);
    } catch {
      toast.error('Failed to load ops data');
    }
  }

  useEffect(() => {
    void loadOpsData();
  }, [alertStatusFilter, logLevelFilter, logTagFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      void loadOpsData();
    }, 25000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, alertStatusFilter, logLevelFilter, logTagFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchReport() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const { data } = await api.getFinanceReport(params);
      setReport(data);
      await loadOpsData();
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  }

  async function createExportJob(type: string) {
    try {
      await api.createExportJob(type, { from: dateFrom || null, to: dateTo || null });
      toast.success(`${type} export job queued`);
      await loadOpsData();
    } catch {
      toast.error('Failed to queue export job');
    }
  }

  async function acknowledgeAlert(id: string) {
    try {
      await api.acknowledgeAlertEvent(id);
      toast.success('Alert acknowledged');
      await loadOpsData();
    } catch {
      toast.error('Failed to acknowledge alert');
    }
  }

  async function toggleRule(rule: any) {
    try {
      await api.updateAlertRule(rule.key, {
        enabled: !rule.enabled,
        threshold: rule.threshold,
        window_minutes: rule.window_minutes,
        severity: rule.severity,
        channels: rule.channels,
      });
      toast.success('Rule updated');
      await loadOpsData();
    } catch {
      toast.error('Failed to update rule');
    }
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

  const totalCollected = report?.transactions?.reduce((s: number, t: any) => s + Number(t.grand_total || 0), 0) || 0;
  const totalPaidOut = report?.payouts?.filter((p: any) => p.status === 'SUCCESS').reduce((s: number, p: any) => s + Number(p.amount || 0), 0) || 0;
  const totalFees = report?.transactions?.reduce((s: number, t: any) => s + Number(t.buyer_platform_fee || 0) + Number(t.seller_platform_fee || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap gap-3 sm:gap-4 items-end px-3 py-3 sm:px-6 sm:py-4">
          <div className="space-y-1 w-full sm:w-auto">
            <Label className="text-xs">Quick Range</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const to = new Date();
                  const from = new Date();
                  from.setDate(to.getDate() - 7);
                  setDateFrom(from.toISOString().slice(0, 10));
                  setDateTo(to.toISOString().slice(0, 10));
                }}
              >
                7D
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const to = new Date();
                  const from = new Date();
                  from.setDate(to.getDate() - 30);
                  setDateFrom(from.toISOString().slice(0, 10));
                  setDateTo(to.toISOString().slice(0, 10));
                }}
              >
                30D
              </Button>
            </div>
          </div>
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
          <Button variant={autoRefresh ? 'default' : 'outline'} onClick={() => setAutoRefresh((v) => !v)} className="w-full sm:w-auto">
            {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
          </Button>
        </CardContent>
      </Card>

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
                  {(report?.transactions || []).slice(0, 50).map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.short_id}</TableCell>
                      <TableCell>{t.buyer_name}</TableCell>
                      <TableCell>{t.seller_name}</TableCell>
                      <TableCell>GHS {Number(t.product_total).toFixed(2)}</TableCell>
                      <TableCell>GHS {(Number(t.buyer_platform_fee) + Number(t.seller_platform_fee)).toFixed(2)}</TableCell>
                      <TableCell className="font-medium">GHS {Number(t.grand_total).toFixed(2)}</TableCell>
                      <TableCell>{t.status}</TableCell>
                      <TableCell className="text-xs">{format(new Date(t.created_at), 'dd MMM yy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alert Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alertRules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rules found.</p>
                ) : (
                  alertRules.map((rule) => (
                    <div key={rule.key} className="rounded-lg border p-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{rule.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Threshold: {rule.threshold} / {rule.window_minutes}m ({rule.severity})
                        </p>
                      </div>
                      <Button size="sm" variant={rule.enabled ? 'default' : 'outline'} onClick={() => void toggleRule(rule)}>
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between gap-3">
                  <span>Alert Events</span>
                  <div className="flex items-center gap-2">
                    <Button variant={alertStatusFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setAlertStatusFilter('all')}>All</Button>
                    <Button variant={alertStatusFilter === 'OPEN' ? 'default' : 'outline'} size="sm" onClick={() => setAlertStatusFilter('OPEN')}>Open</Button>
                    <Button variant={alertStatusFilter === 'ACKNOWLEDGED' ? 'default' : 'outline'} size="sm" onClick={() => setAlertStatusFilter('ACKNOWLEDGED')}>Ack</Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alertEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No alert events yet.</p>
                ) : (
                  alertEvents.slice(0, 8).map((event) => (
                    <div key={event.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{event.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{event.body}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => void acknowledgeAlert(event.id)} disabled={event.status !== 'OPEN'}>
                          {event.status === 'OPEN' ? 'Acknowledge' : event.status}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Redis / Queue Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  Redis: <span className={reliability?.redis?.ok ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{reliability?.redis?.ok ? 'Healthy' : 'Degraded'}</span>
                </p>
                {(reliability?.queue_health || []).map((q: any) => (
                  <div key={q.name} className="rounded-lg border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{q.name}</span>
                      <span className={q.ok ? 'text-green-600' : 'text-red-600'}>{q.ok ? 'OK' : 'Error'}</span>
                    </div>
                    {q.counts && (
                      <p className="text-xs text-muted-foreground mt-1">
                        W:{q.counts.waiting || 0} A:{q.counts.active || 0} F:{q.counts.failed || 0} D:{q.counts.delayed || 0}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Failure Rates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Dead Letters (1h / 24h)</p>
                  <p className="font-semibold">{reliability?.dead_letters?.count_1h || 0} / {reliability?.dead_letters?.count_24h || 0}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">SMS Failure Rate (1h)</p>
                  <p className="font-semibold">{Number(reliability?.sms?.failure_rate_1h_pct || 0).toFixed(2)}%</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">SMS Failure Rate (24h)</p>
                  <p className="font-semibold">{Number(reliability?.sms?.failure_rate_24h_pct || 0).toFixed(2)}%</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Latest Dead Letters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(reliability?.dead_letters?.latest || []).slice(0, 6).map((item: any) => (
                  <div key={item.id} className="rounded-lg border p-2">
                    <p className="text-xs font-semibold">{item.queue_name} · {item.failure_class}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.error_message}</p>
                  </div>
                ))}
                {(!reliability?.dead_letters?.latest || reliability.dead_letters.latest.length === 0) && (
                  <p className="text-sm text-muted-foreground">No dead letters.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between gap-3">
                <span>Runtime Logs</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={logLevelFilter === 'error' ? 'default' : 'outline'} onClick={() => setLogLevelFilter('error')}>Errors</Button>
                  <Button size="sm" variant={logLevelFilter === 'warn' ? 'default' : 'outline'} onClick={() => setLogLevelFilter('warn')}>Warn</Button>
                  <Button size="sm" variant={logLevelFilter === 'info' ? 'default' : 'outline'} onClick={() => setLogLevelFilter('info')}>Info</Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Filter by tag (worker, runtime, startup...)"
                  value={logTagFilter}
                  onChange={(e) => setLogTagFilter(e.target.value)}
                />
                <Button variant="outline" onClick={() => void loadOpsData()}>Refresh</Button>
              </div>
              <div className="space-y-2">
                {opsLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No logs for current filter.</p>
                ) : (
                  opsLogs.slice(0, 20).map((log) => (
                    <div key={log.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase">{log.level} · {log.tag}</p>
                          <p className="text-sm mt-1">{log.message}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Async Export Jobs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void createExportJob('transactions')}>Queue Transactions Export</Button>
                <Button size="sm" variant="outline" onClick={() => void createExportJob('payouts')}>Queue Payouts Export</Button>
                <Button size="sm" variant="outline" onClick={() => void createExportJob('disputes')}>Queue Disputes Export</Button>
                <Button size="sm" variant="outline" onClick={() => void createExportJob('users')}>Queue Users Export</Button>
              </div>
              <div className="space-y-2">
                {exportJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No export jobs yet.</p>
                ) : (
                  exportJobs.slice(0, 8).map((job) => (
                    <div key={job.id} className="rounded-lg border p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{job.export_type}</p>
                        <p className="text-xs text-muted-foreground">Status: {job.status} • {new Date(job.created_at).toLocaleString()}</p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-[240px]">{job.file_path || 'pending file path'}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
      </>
    </div>
  );
}

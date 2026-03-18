'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { TrustBadge, TrustScoreRing } from '@/components/shared/TrustBadge';
import { WhatsAppShare } from '@/components/shared/WhatsAppShare';
import {
  Banknote, TrendingUp, Package, Users, Star, Clock, ArrowUpRight, ArrowDownRight,
  ShieldCheck, Award, BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TRANSACTION_STATUSES } from '@/lib/constants';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SellerDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      api.getSellerAnalytics()
        .then(res => setData(res.data))
        .catch(() => toast.error('Failed to load analytics'))
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const trust = data?.trust_score;
  const monthlyData = data?.monthly_revenue ? Object.entries(data.monthly_revenue).slice(-6) : [];
  const maxMonthly = monthlyData.length > 0 ? Math.max(...monthlyData.map(([, v]) => v as number)) : 1;
  const completionRate = data?.total_transactions > 0
    ? ((data.completed_transactions / data.total_transactions) * 100).toFixed(1)
    : '0';

  const kpis = [
    { label: 'Total Revenue', value: `GHS ${(data?.total_revenue || 0).toFixed(2)}`, icon: Banknote, color: 'text-green-600 bg-green-100', trend: '+12%' },
    { label: 'Transactions', value: data?.total_transactions || 0, icon: Package, color: 'text-blue-600 bg-blue-100', sub: `${data?.completed_transactions || 0} completed` },
    { label: 'Unique Buyers', value: data?.unique_buyers || 0, icon: Users, color: 'text-purple-600 bg-purple-100', sub: `${(data?.repeat_buyer_rate || 0).toFixed(0)}% return rate` },
    { label: 'Avg Rating', value: data?.avg_rating ? `${data.avg_rating.toFixed(1)} / 5` : 'N/A', icon: Star, color: 'text-yellow-600 bg-yellow-100', sub: `${data?.total_reviews || 0} reviews` },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 mb-3 shadow-sm">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              Seller Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Performance Overview</h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">Welcome back, {profile?.full_name || 'Seller'}. Here's how your business is doing.</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <WhatsAppShare role="seller" />
            <Link href="/seller/step-1" className="flex-1 sm:flex-initial">
              <Button className="rounded-full gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-bold h-11 px-4 sm:px-6 w-full sm:w-auto">
                <Package className="h-4 w-4" /> View Orders
              </Button>
            </Link>
          </div>
        </div>

        {/* Trust Score Card */}
        {trust && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Card className="rounded-xl sm:rounded-3xl border-slate-200 bg-white shadow-xl shadow-slate-200/40 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <CardContent className="flex flex-col gap-6 sm:gap-8 py-6 sm:py-8 px-4 sm:px-6 sm:flex-row sm:items-center relative z-10">
                <TrustScoreRing score={trust.trust_score} size={120} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <TrustBadge tier={trust.tier} score={trust.trust_score} totalTransactions={trust.total_transactions} isVerified={!!trust.verified_at} size="lg" />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                    Your trust score is calculated from completion rate, delivery speed, ratings, and transaction volume.
                    {trust.tier === 'NEW' && ' Complete more transactions to unlock higher tiers!'}
                    {trust.tier === 'BRONZE' && ' Keep up the great work to reach Silver!'}
                    {trust.tier === 'GOLD' && ' You\'re one of our top sellers!'}
                    {trust.tier === 'PLATINUM' && ' Elite status — you\'re in the top tier!'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-slate-700">
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-100"><Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" /> {trust.completed_ok} completed</span>
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-100"><Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" /> {trust.avg_seller_rating?.toFixed(1) || 'N/A'} avg rating</span>
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-100"><Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" /> {trust.avg_delivery_hours ? `${trust.avg_delivery_hours.toFixed(0)}h avg delivery` : 'No data'}</span>
                  </div>
                </div>
                <Link href="/seller/verify" className="w-full sm:w-auto">
                  <Button variant="outline" className="rounded-full gap-2 shrink-0 h-11 px-4 sm:px-6 font-bold border-slate-200 hover:bg-slate-50 w-full sm:w-auto">
                    <ShieldCheck className="h-4 w-4 text-green-600" /> Get Verified
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {kpis.map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="rounded-xl sm:rounded-3xl border-slate-200 shadow-lg shadow-slate-200/30 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 bg-white">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                    <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl ${kpi.color}`}>
                      <kpi.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
                  {kpi.sub && <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 sm:mt-2">{kpi.sub}</p>}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 mb-6 sm:mb-8">
          {/* Revenue Chart */}
          <Card className="rounded-xl sm:rounded-3xl border-slate-200 shadow-lg shadow-slate-200/30 bg-white overflow-hidden">
            <CardHeader className="pb-2 px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900"><BarChart3 className="h-5 w-5 text-primary" /> Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {monthlyData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
                  <Banknote className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-500">Complete transactions to see revenue trends.</p>
                </div>
              ) : (
                <div className="flex items-end gap-1.5 sm:gap-3 h-48 pt-4">
                  {monthlyData.map(([month, value]) => {
                    const height = ((value as number) / maxMonthly) * 100;
                    return (
                      <div key={month} className="flex-1 flex flex-col items-center gap-2 group">
                        <span className="text-xs font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity -translate-y-2 group-hover:translate-y-0">GHS {(value as number).toFixed(0)}</span>
                        <div className="w-full rounded-t-xl bg-slate-100 relative overflow-hidden transition-all duration-300 group-hover:bg-primary/10" style={{ height: `${Math.max(8, height)}%` }}>
                          <div className="absolute bottom-0 left-0 right-0 rounded-t-xl bg-gradient-to-t from-primary to-blue-400 transition-all duration-500" style={{ height: `${height}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">{month.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completion Rate + Status */}
          <Card className="rounded-xl sm:rounded-3xl border-slate-200 shadow-lg shadow-slate-200/30 bg-white overflow-hidden">
            <CardHeader className="pb-2 px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900"><Award className="h-5 w-5 text-primary" /> Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
              <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-slate-600">Completion Rate</span>
                  <span className="font-black text-primary">{completionRate}%</span>
                </div>
                <Progress value={parseFloat(completionRate)} className="h-2.5 bg-slate-200" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-600 mb-3 uppercase tracking-wider">Status Breakdown</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data?.status_breakdown || {}).map(([status, count]) => (
                    <Badge key={status} variant="outline" className={`px-3 py-1.5 text-xs font-bold border-transparent ${TRANSACTION_STATUSES[status]?.color || 'bg-slate-100 text-slate-700'}`}>
                      {TRANSACTION_STATUSES[status]?.label || status} <span className="ml-1 opacity-70">({count as number})</span>
                    </Badge>
                  ))}
                </div>
              </div>

              {data?.avg_delivery_hours && (
                <div className="flex items-center gap-3 sm:gap-4 bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Delivery Time</p>
                    <p className="text-xl sm:text-2xl font-black text-slate-900">{data.avg_delivery_hours.toFixed(1)}h</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        {data?.recent_transactions?.length > 0 && (
          <Card className="rounded-xl sm:rounded-3xl border-slate-200 shadow-lg shadow-slate-200/30 bg-white">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="space-y-3 overflow-x-auto">
                {data.recent_transactions.map((txn: any) => (
                  <div key={txn.id} className="flex items-center justify-between rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 px-3 sm:px-5 py-3 sm:py-4 hover:bg-slate-100 transition-colors cursor-pointer gap-3 min-w-0">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
                        <Package className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{txn.product_name || 'Transaction'}</p>
                        <p className="text-xs font-medium text-slate-500">{format(new Date(txn.created_at), 'dd MMM yyyy')}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm sm:text-base font-black text-slate-900">GHS {parseFloat(txn.product_total).toFixed(2)}</p>
                      <Badge variant="outline" className={`mt-1 border-transparent ${TRANSACTION_STATUSES[txn.status]?.color || 'bg-slate-200'}`}>
                        {TRANSACTION_STATUSES[txn.status]?.label || txn.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}

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
import { AlertTriangle, Shield, Eye, Flag, ArrowRight, Filter } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface FlaggedTransaction {
  id: string;
  short_id: string;
  product_name: string;
  grand_total: string;
  fraud_score: number;
  fraud_flags: Array<{ code: string; label: string; weight: number }>;
  is_flagged: boolean;
  buyer_name: string;
  seller_name: string;
  status: string;
  created_at: string;
}

export default function FraudMonitorPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<FlaggedTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const isPrivileged = profile?.role === 'admin' || profile?.role === 'superadmin';

  useEffect(() => {
    if (!authLoading && (!user || !isPrivileged)) router.push('/login');
  }, [authLoading, user, profile, router, isPrivileged]);

  useEffect(() => {
    if (user && isPrivileged) {
      api.getAdminTransactions({ status: 'HOLD' })
        .then(res => setTransactions(res.data || []))
        .catch(() => toast.error('Failed to load flagged transactions'))
        .finally(() => setLoading(false));
    }
  }, [user, profile, isPrivileged]);

  function getScoreColor(score: number) {
    if (score >= 75) return 'bg-red-100 text-red-800 border-red-200';
    if (score >= 50) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (score >= 25) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" /> Fraud Monitor
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">Transactions flagged by automated fraud scoring.</p>
          </div>
          <Link href="/admin">
            <Button variant="outline" className="rounded-full gap-2 w-full sm:w-auto"><ArrowRight className="h-4 w-4" /> Back to Dashboard</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <Card className="rounded-2xl border-red-200 bg-red-50">
            <CardContent className="pt-4 sm:pt-6 text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-red-700">{transactions.filter(t => (t.fraud_score || 0) >= 75).length}</p>
              <p className="text-xs text-red-600 mt-1">High Risk (75+)</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-orange-200 bg-orange-50">
            <CardContent className="pt-4 sm:pt-6 text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-orange-700">{transactions.filter(t => (t.fraud_score || 0) >= 50 && (t.fraud_score || 0) < 75).length}</p>
              <p className="text-xs text-orange-600 mt-1">Medium Risk (50-74)</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-green-200 bg-green-50">
            <CardContent className="pt-4 sm:pt-6 text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-green-700">{transactions.filter(t => (t.fraud_score || 0) < 50).length}</p>
              <p className="text-xs text-green-600 mt-1">Low Risk (&lt;50)</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : transactions.length === 0 ? (
          <Card className="rounded-2xl text-center py-16">
            <Shield className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <p className="text-lg font-semibold text-green-800">All Clear</p>
            <p className="text-muted-foreground">No flagged transactions at this time.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {transactions.map(txn => (
              <Card key={txn.id} className="rounded-2xl hover:shadow-md transition-shadow">
                <CardContent className="px-3 py-3 sm:px-6 sm:py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold">{txn.short_id}</span>
                        <Badge className={`text-xs ${getScoreColor(txn.fraud_score || 0)}`}>
                          Score: {txn.fraud_score || 0}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">{txn.status}</Badge>
                      </div>
                      <p className="text-sm">{txn.product_name} — <span className="font-semibold">GHS {Number(txn.grand_total).toFixed(2)}</span></p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Buyer: {txn.buyer_name} | Seller: {txn.seller_name} | {new Date(txn.created_at).toLocaleDateString()}
                      </p>

                      {txn.fraud_flags && txn.fraud_flags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {txn.fraud_flags.map((flag, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                              <Flag className="h-2.5 w-2.5" /> {flag.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <Link href={`/admin/transactions/${txn.id}`} className="self-start sm:self-auto">
                      <Button variant="outline" size="sm" className="rounded-full gap-1.5 shrink-0 w-full sm:w-auto">
                        <Eye className="h-3.5 w-3.5" /> Review
                      </Button>
                    </Link>
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

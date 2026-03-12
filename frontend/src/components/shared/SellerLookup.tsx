'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { TrustBadge, TrustScoreRing } from './TrustBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Shield, Star, Package, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SellerInfo {
  found: boolean;
  name?: string;
  trust_score?: number;
  tier?: string;
  total_transactions?: number;
  completed?: number;
  avg_rating?: number;
  is_verified?: boolean;
}

interface Props {
  phone: string;
  onPhoneChange?: (phone: string) => void;
  compact?: boolean;
}

export function SellerLookup({ phone, onPhoneChange, compact = false }: Props) {
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const lookup = useCallback(async () => {
    if (!phone || phone.length < 10) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.getSellerReputation(phone);
      setSeller(res.data);
    } catch {
      setSeller(null);
    } finally {
      setLoading(false);
    }
  }, [phone]);

  // Auto-lookup when phone reaches full length
  const handlePhoneChange = (value: string) => {
    onPhoneChange?.(value);
    if (value.length >= 10) {
      setTimeout(() => {
        setLoading(true);
        setSearched(true);
        api.getSellerReputation(value)
          .then(res => setSeller(res.data))
          .catch(() => setSeller(null))
          .finally(() => setLoading(false));
      }, 500);
    } else {
      setSeller(null);
      setSearched(false);
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            value={phone}
            onChange={e => handlePhoneChange(e.target.value)}
            placeholder="e.g. 0241234567"
            className="pr-10"
          />
          {loading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <AnimatePresence>
          {searched && !loading && seller && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {seller.found ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">{seller.name}</span>
                    <TrustBadge tier={seller.tier || 'NEW'} score={seller.trust_score || 0} isVerified={seller.is_verified} size="sm" />
                  </div>
                  <div className="flex gap-3 text-xs text-green-700 mt-1">
                    <span>{seller.total_transactions || 0} transactions</span>
                    <span>{seller.completed || 0} completed</span>
                    {(seller.avg_rating || 0) > 0 && <span className="flex items-center gap-0.5"><Star className="h-3 w-3" /> {seller.avg_rating?.toFixed(1)}</span>}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-800">New seller — no transaction history yet</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">This doesn't mean they're untrustworthy. Escrow protects you either way.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Card className="rounded-2xl border-primary/20">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Seller Reputation Check</span>
        </div>

        <div className="flex gap-2">
          <Input
            value={phone}
            onChange={e => handlePhoneChange(e.target.value)}
            placeholder="Enter seller phone number"
            className="flex-1"
          />
          <Button onClick={lookup} disabled={loading || phone.length < 10} variant="outline" size="sm" className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Check
          </Button>
        </div>

        <AnimatePresence>
          {searched && !loading && seller && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {seller.found ? (
                <div className="flex items-center gap-4 rounded-xl bg-green-50 p-4">
                  <TrustScoreRing score={seller.trust_score || 0} size={60} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{seller.name}</span>
                      <TrustBadge tier={seller.tier || 'NEW'} score={seller.trust_score || 0} isVerified={seller.is_verified} size="sm" />
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {seller.total_transactions} txns</span>
                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {seller.completed} completed</span>
                      {(seller.avg_rating || 0) > 0 && <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {seller.avg_rating?.toFixed(1)}</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50 p-3 text-center">
                  <AlertTriangle className="mx-auto h-5 w-5 text-amber-500 mb-1" />
                  <p className="text-xs font-medium text-amber-800">This seller has no history on our platform</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">Don't worry — escrow protection covers you regardless</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

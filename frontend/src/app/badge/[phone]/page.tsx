'use client';

import { useState, useEffect, use } from 'react';
import { api } from '@/lib/api';
import { ShieldCheck, Star, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';

const TIER_COLORS: Record<string, { gradient: string; text: string; accent: string }> = {
  NEW: { gradient: 'from-gray-100 to-gray-200', text: 'text-gray-700', accent: 'bg-gray-500' },
  BRONZE: { gradient: 'from-amber-100 to-amber-200', text: 'text-amber-800', accent: 'bg-amber-500' },
  SILVER: { gradient: 'from-gray-200 to-gray-300', text: 'text-gray-800', accent: 'bg-gray-500' },
  GOLD: { gradient: 'from-yellow-100 to-yellow-300', text: 'text-yellow-800', accent: 'bg-yellow-500' },
  PLATINUM: { gradient: 'from-purple-100 to-purple-300', text: 'text-purple-800', accent: 'bg-purple-600' },
};

export default function SellerBadgePage({ params }: { params: Promise<{ phone: string }> }) {
  const { phone } = use(params);
  const [data, setData] = useState<{
    found: boolean;
    name: string;
    tier: string;
    is_verified: boolean;
    total_transactions: number;
    completed: number;
    avg_rating: number;
    trust_score: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSellerReputation(decodeURIComponent(phone))
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [phone]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-white">
        <div className="animate-pulse text-primary">Loading seller badge...</div>
      </div>
    );
  }

  if (!data?.found) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-white">
        <div className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <BrandLogo size={64} priority />
          </div>
          <h1 className="text-xl font-bold">Seller Not Found</h1>
          <p className="text-muted-foreground mt-2">This seller has not used Sell-Safe Buy-Safe yet.</p>
          <Link href="/" className="mt-6 inline-block">
            <Button className="rounded-full gap-2">Learn About Secure PSPs <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </div>
    );
  }

  const colors = TIER_COLORS[data.tier] || TIER_COLORS.NEW;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4">
      <div className={`w-full max-w-sm rounded-3xl bg-gradient-to-br ${colors.gradient} p-8 shadow-xl`}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center rounded-2xl bg-white p-2 shadow-md">
            <BrandLogo size={56} priority />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Sell-Safe Buy-Safe</h1>
          <p className="text-sm mt-1 opacity-70">Verified Seller Badge</p>
        </div>

        <div className="mt-6 rounded-2xl bg-white/80 p-6 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-xl font-bold">{data.name}</h2>
            <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${colors.text} bg-white/50`}>
              {data.is_verified ? <CheckCircle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              {data.tier} Seller
              {data.is_verified && <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">VERIFIED</span>}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-extrabold">{data.total_transactions}</p>
              <p className="text-[11px] text-muted-foreground">Transactions</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold">{data.completed}</p>
              <p className="text-[11px] text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold flex items-center justify-center gap-1">
                {data.avg_rating > 0 ? data.avg_rating.toFixed(1) : '—'}
                <Star className="h-3.5 w-3.5 text-yellow-500" />
              </p>
              <p className="text-[11px] text-muted-foreground">Rating</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-green-50 p-3 text-center">
            <p className="text-xs font-medium text-green-800">
              Trust Score: {Math.round(data.trust_score)}/100
            </p>
            <div className="mt-1.5 h-2 rounded-full bg-green-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-1000"
                style={{ width: `${data.trust_score}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href={`/buyer/step-1?seller_phone=${encodeURIComponent(phone)}`}>
            <Button className="w-full rounded-full gap-2 shadow-lg">
              Buy Safely from {data.name.split(' ')[0]} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-3 text-[11px] opacity-60">
            Powered by Sell-Safe Buy-Safe • GSG BRANDS
          </p>
        </div>
      </div>
    </div>
  );
}

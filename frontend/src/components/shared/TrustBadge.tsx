'use client';

import { Shield, ShieldCheck, Award, Crown, Star } from 'lucide-react';

const TIER_CONFIG: Record<string, { icon: typeof Shield; color: string; bg: string; label: string }> = {
  NEW: { icon: Shield, color: 'text-gray-500', bg: 'bg-gray-100', label: 'New Seller' },
  BRONZE: { icon: ShieldCheck, color: 'text-amber-700', bg: 'bg-amber-50', label: 'Bronze Seller' },
  SILVER: { icon: Award, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Silver Seller' },
  GOLD: { icon: Crown, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Gold Seller' },
  PLATINUM: { icon: Star, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Platinum Seller' },
};

interface TrustBadgeProps {
  tier: string;
  score: number;
  totalTransactions?: number;
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TrustBadge({ tier, score, totalTransactions, isVerified, size = 'md' }: TrustBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.NEW;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSize = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-5 w-5' };

  return (
    <div className={`inline-flex items-center rounded-full ${config.bg} ${config.color} font-medium ${sizeClasses[size]}`}>
      <Icon className={iconSize[size]} />
      <span>{config.label}</span>
      {isVerified && (
        <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">VERIFIED</span>
      )}
      {size !== 'sm' && totalTransactions !== undefined && (
        <span className="ml-1 text-[10px] opacity-70">({totalTransactions} txns)</span>
      )}
    </div>
  );
}

export function TrustScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={4} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={4} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>{Math.round(score)}</span>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Shield, Users, ArrowLeftRight, TrendingUp } from 'lucide-react';

function AnimatedCounter({ target, duration = 2000, prefix = '', suffix = '' }: { target: number; duration?: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  function formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
    return n.toLocaleString();
  }

  return <span ref={ref}>{prefix}{formatNumber(count)}{suffix}</span>;
}

interface StatsData {
  total_transactions: number;
  total_volume_ghs: number;
  total_sellers: number;
  success_rate: number;
}

export function LiveStats({ stats }: { stats: StatsData | null }) {
  if (!stats) return null;

  const items = [
    { label: 'Transactions Protected', value: stats.total_transactions, icon: ArrowLeftRight, prefix: '', suffix: '+' },
    { label: 'Volume Secured', value: stats.total_volume_ghs, icon: Shield, prefix: 'GHS ', suffix: '' },
    { label: 'Trusted Sellers', value: stats.total_sellers, icon: Users, prefix: '', suffix: '+' },
    { label: 'Success Rate', value: stats.success_rate, icon: TrendingUp, prefix: '', suffix: '%' },
  ];

  return (
    <section className="border-y border-border/40 bg-card/50 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                <AnimatedCounter target={item.value} prefix={item.prefix} suffix={item.suffix} />
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

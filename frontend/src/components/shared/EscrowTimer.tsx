'use client';

import { useState, useEffect } from 'react';
import { Shield, Clock } from 'lucide-react';

interface Props {
  autoReleaseAt?: string;
  status: string;
}

export function ProtectionTimer({ autoReleaseAt, status }: Props) {
  const [timeLeft, setTimeLeft] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!autoReleaseAt) return;

    const target = new Date(autoReleaseAt).getTime();
    const totalDuration = 24 * 60 * 60 * 1000; // 24 hours

    function update() {
      const now = Date.now();
      const remaining = target - now;

      if (remaining <= 0) {
        setTimeLeft('Auto-releasing...');
        setProgress(100);
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m remaining`);
      setProgress(Math.min(100, ((totalDuration - remaining) / totalDuration) * 100));
    }

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [autoReleaseAt]);

  if (!['PAID', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED_PENDING'].includes(status)) return null;

  const statusMessages: Record<string, string> = {
    PAID: 'Funds secured with PSPs. Waiting for seller to dispatch.',
    DISPATCHED: 'Item dispatched. Funds remain protected until you confirm delivery.',
    IN_TRANSIT: 'Your item is on the way. Funds are safe.',
    DELIVERED_PENDING: 'Please confirm delivery to release funds.',
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Transaction Protection Active</p>
          <p className="text-xs text-muted-foreground mt-0.5">{statusMessages[status]}</p>

          {autoReleaseAt && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" /> Auto-release countdown
                </span>
                <span className="font-medium">{timeLeft}</span>
              </div>
              <div className="h-1.5 rounded-full bg-primary/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

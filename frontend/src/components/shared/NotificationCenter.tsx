'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Package, CreditCard, Truck, AlertTriangle, CheckCircle, Shield, Ban } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ICON_MAP: Record<string, typeof Bell> = {
  PAYMENT_SUCCESS: CreditCard,
  DISPATCH: Truck,
  DELIVERY_CONFIRMED: CheckCircle,
  PAYOUT_SUCCESS: CreditCard,
  DISPUTE_OPENED: AlertTriangle,
  DISPUTE_RESOLVED: Shield,
  REPLACEMENT_REQUESTED: Package,
  FRAUD_FLAG: Ban,
};

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    function load() {
      api.request<{ data: Notification[] }>('/api/auth/notifications')
        .then(res => setNotifications(res.data || []))
        .catch(() => {});
    }

    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  async function markAllRead() {
    try {
      await api.request('/api/auth/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  }

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-7">Mark all read</Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              No notifications yet
            </div>
          ) : (
            <div className="divide-y">
              {notifications.slice(0, 20).map(n => {
                const Icon = ICON_MAP[n.type] || Bell;
                return (
                  <div key={n.id} className={`flex gap-3 px-4 py-3 ${!n.read ? 'bg-primary/5' : ''}`}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.read && <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

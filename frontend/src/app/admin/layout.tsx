'use client';

import { useEffect, useMemo, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, LayoutDashboard, ArrowLeftRight, Banknote, AlertTriangle, Star, Settings, FileBarChart, LogOut, Menu, User, BarChart3, Search, Command, Sparkles, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const sidebarLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: User },
  { href: '/admin/verifications', label: 'KYC', icon: ShieldCheck },
  { href: '/admin/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/admin/payouts', label: 'Payouts', icon: Banknote },
  { href: '/admin/disputes', label: 'Disputes', icon: AlertTriangle },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/reports', label: 'Reports', icon: FileBarChart },
  { href: '/seller/dashboard', label: 'Seller Hub', icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, profileLoaded, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  const isPrivileged = profile?.role === 'admin' || profile?.role === 'superadmin';
  const filteredLinks = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return sidebarLinks;
    return sidebarLinks.filter((link) => link.label.toLowerCase().includes(q));
  }, [commandQuery]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    // Only redirect away once we know the profile loaded AND role isn't admin
    if (!loading && user && profileLoaded && !isPrivileged) {
      router.push('/login');
    }
  }, [loading, user, profile, profileLoaded, router, isPrivileged]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isShortcut) return;
      event.preventDefault();
      setCommandOpen((prev) => !prev);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Show spinner while auth or profile is loading
  if (loading || !user || !profileLoaded) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (!isPrivileged) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Access denied</div>;
  }

  function SidebarNav() {
    return (
      <nav className="flex flex-col gap-1 p-3">
        {sidebarLinks.map(link => {
          const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-slate-800 bg-slate-950 text-slate-100">
        <div className="border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold tracking-tight">Superadmin OS</p>
              <p className="text-xs text-slate-400">Escrow Control Plane</p>
            </div>
          </div>
        </div>
        <div className="px-3 py-3">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
            Search modules
            <span className="ml-auto inline-flex items-center gap-1 rounded border border-slate-700 px-1.5 py-0.5 text-[10px]">
              <Command className="h-3 w-3" />K
            </span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 p-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20"><User className="h-4 w-4 text-primary" /></div>
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium text-slate-100">{profile?.full_name || 'Admin'}</p>
              <p className="truncate text-xs text-slate-400">{profile?.phone}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-slate-300 hover:bg-slate-800 hover:text-white"><LogOut className="h-4 w-4" /> Sign Out</Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-md text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:hidden">
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-slate-800 bg-slate-950 p-0 text-slate-100">
                <div className="border-b border-slate-800 px-6 py-5">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="font-bold">Superadmin OS</span>
                  </div>
                </div>
                <SidebarNav />
              </SheetContent>
            </Sheet>
            <h2 className="text-base sm:text-lg font-semibold truncate">
              {sidebarLinks.find(l => l.href === pathname)?.label || 'Admin'}
            </h2>
            <Badge variant="secondary" className="hidden md:inline-flex uppercase">{profile?.role}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden sm:flex items-center gap-2 text-muted-foreground shadow-sm"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="h-3.5 w-3.5" />
              Command Center
              <span className="hidden md:inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]">
                <Command className="h-3 w-3" />K
              </span>
            </Button>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Back to Site</Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </div>
      </div>

      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Superadmin Command Center
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="Search modules (users, payouts, disputes...)"
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
            />
            <div className="max-h-72 overflow-y-auto space-y-1 rounded-lg border p-2">
              {filteredLinks.length === 0 ? (
                <p className="px-2 py-4 text-sm text-muted-foreground">No matching admin modules.</p>
              ) : (
                filteredLinks.map((link) => (
                  <button
                    key={link.href}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setCommandOpen(false);
                      setCommandQuery('');
                      router.push(link.href);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{link.href}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

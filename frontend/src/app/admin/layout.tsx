'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, LayoutDashboard, ArrowLeftRight, Banknote, AlertTriangle, Star, Settings, FileBarChart, LogOut, Menu, User, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const sidebarLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    // Only redirect away once we know the profile loaded AND role isn't admin
    if (!loading && user && profileLoaded && profile?.role !== 'admin') {
      router.push('/login');
    }
  }, [loading, user, profile, profileLoaded, router]);

  // Show spinner while auth or profile is loading
  if (loading || !user || !profileLoaded) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (profile?.role !== 'admin') {
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
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
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
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card">
        <div className="flex items-center gap-2 px-6 py-5 border-b">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          <span className="font-bold">Admin Panel</span>
        </div>
        <ScrollArea className="flex-1">
          <SidebarNav />
        </ScrollArea>
        <div className="border-t p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"><User className="h-4 w-4 text-primary" /></div>
            <div className="text-sm"><p className="font-medium">{profile?.full_name || 'Admin'}</p><p className="text-xs text-muted-foreground">{profile?.phone}</p></div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2"><LogOut className="h-4 w-4" /> Sign Out</Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger className="lg:hidden">
                <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex items-center gap-2 px-6 py-5 border-b">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-bold">Admin Panel</span>
                </div>
                <SidebarNav />
              </SheetContent>
            </Sheet>
            <h2 className="text-lg font-semibold">
              {sidebarLinks.find(l => l.href === pathname)?.label || 'Admin'}
            </h2>
          </div>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Back to Site</Link>
        </header>

        {/* Page Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

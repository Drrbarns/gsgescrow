'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Shield, Menu, LogOut, User, LayoutDashboard, Calculator, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { NotificationCenter } from '@/components/shared/NotificationCenter';

const navLinks = [
  { href: '/hub', label: 'Transaction Hub' },
  { href: '/tracking', label: 'Track' },
  { href: '/calculator', label: 'Fee Calculator' },
  { href: '/reviews', label: 'Reviews' },
];

export function Header() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          <span className="hidden sm:inline">Sell-Safe Buy-Safe</span>
          <span className="sm:hidden">SBS</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <NotificationCenter />
          {user ? (
            <>
              {profile?.role === 'admin' && (
                <Link href="/admin">
                  <div className="hidden sm:flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1.5 text-sm hover:bg-primary/20 transition-colors cursor-pointer">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span className="font-bold text-primary">Super Admin</span>
                  </div>
                </Link>
              )}
              {profile?.role !== 'admin' && (profile?.role === 'seller') && (
                <Link href="/seller/dashboard">
                  <Button variant="ghost" size="sm" className="gap-1.5 rounded-full">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Seller Hub</span>
                  </Button>
                </Link>
              )}
              {profile?.role !== 'admin' && (
                <div className="hidden sm:flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm">
                  <User className="h-3.5 w-3.5" />
                  <span className="font-medium">{profile?.full_name || profile?.phone || 'User'}</span>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 rounded-full">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button size="sm" variant="ghost" className="rounded-full hidden sm:flex">Sign In</Button>
              </Link>
              <Link href="/admin-login">
                <Button size="sm" className="rounded-full">Admin Login</Button>
              </Link>
            </>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="md:hidden inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="flex flex-col gap-2 pt-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

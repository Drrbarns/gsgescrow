'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Shield, Menu, LogOut, User, LayoutDashboard, Calculator, BarChart3,
  Package, MapPin, Star, ShoppingBag, Store, ChevronRight, X, AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';
import { NotificationCenter } from '@/components/shared/NotificationCenter';

const navLinks = [
  { href: '/hub', label: 'Transaction Hub', icon: Package, desc: 'View all transactions' },
  { href: '/tracking', label: 'Track Order', icon: MapPin, desc: 'Track your delivery' },
  { href: '/calculator', label: 'Fee Calculator', icon: Calculator, desc: 'Estimate costs' },
  { href: '/reviews', label: 'Reviews', icon: Star, desc: 'Seller ratings' },
];

export function Header() {
  const pathname = usePathname();
  const { user, profile, baseProfile, impersonation, stopImpersonation, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const isLoginPage = pathname === '/login';
  const isPrivileged = profile?.role === 'admin' || profile?.role === 'superadmin';
  const isSuperadmin = profile?.role === 'superadmin';

  return (
    <>
      {impersonation && (
        <div className="sticky top-0 z-[60] border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" />
              Impersonation active: {impersonation.target_profile?.full_name || impersonation.target_profile?.phone || 'target user'}
              <span className="font-normal text-amber-800">
                (started by {baseProfile?.full_name || 'superadmin'})
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-full border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200"
              onClick={() => { void stopImpersonation('manual-stop'); }}
            >
              Return to Superadmin
            </Button>
          </div>
        </div>
      )}
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
              {isPrivileged && (
                <Link href="/admin">
                  <div className="hidden sm:flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1.5 text-sm hover:bg-primary/20 transition-colors cursor-pointer">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span className="font-bold text-primary">{isSuperadmin ? 'Super Admin' : 'Admin'}</span>
                  </div>
                </Link>
              )}
              {!isPrivileged && (profile?.role === 'seller') && (
                <Link href="/seller/dashboard">
                  <Button variant="ghost" size="sm" className="gap-1.5 rounded-full">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Seller Hub</span>
                  </Button>
                </Link>
              )}
              {!isPrivileged && (
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
              {!isLoginPage && (
                <Link href="/admin-login">
                  <Button size="sm" className="rounded-full">Admin Login</Button>
                </Link>
              )}
            </>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="md:hidden inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0 border-l border-slate-200 bg-white flex flex-col">
              {/* Menu Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                    <Shield className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-slate-900">Sell-Safe Buy-Safe</span>
                </div>
                <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-500">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* User Info (if logged in) */}
              {user && (
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{profile?.full_name || profile?.phone || 'User'}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {profile?.role === 'superadmin'
                          ? 'Super Admin'
                          : profile?.role === 'admin'
                            ? 'Admin'
                            : profile?.role === 'seller'
                              ? 'Verified Seller'
                              : 'Buyer'}
                      </p>
                    </div>
                    {isPrivileged && (
                      <span className="shrink-0 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20">ADMIN</span>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-3 py-3">
                  <p className="px-2 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Navigation</p>
                  <nav className="flex flex-col gap-0.5">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-primary/5 hover:text-primary transition-all"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <link.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{link.label}</p>
                          <p className="text-[11px] text-slate-400 group-hover:text-primary/60">{link.desc}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary/40 transition-colors" />
                      </Link>
                    ))}
                  </nav>
                </div>

                {/* Quick Actions for logged in users */}
                {user && (
                  <div className="px-3 pb-3">
                    <p className="px-2 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</p>
                    <div className="flex flex-col gap-0.5">
                      {isPrivileged && (
                        <Link href="/admin" onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-primary/5 hover:text-primary transition-all">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <LayoutDashboard className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">Admin Dashboard</p>
                            <p className="text-[11px] text-slate-400 group-hover:text-primary/60">Manage platform</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        </Link>
                      )}
                      {profile?.role === 'seller' && (
                        <Link href="/seller/dashboard" onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-primary/5 hover:text-primary transition-all">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                            <BarChart3 className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">Seller Dashboard</p>
                            <p className="text-[11px] text-slate-400 group-hover:text-primary/60">Sales & analytics</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* CTA Buttons */}
                <div className="px-5 py-4 border-t border-slate-100">
                  <div className="flex flex-col gap-2.5">
                    <Link href="/buyer/step-1" onClick={() => setOpen(false)}>
                      <Button className="w-full h-11 rounded-xl gap-2 font-semibold shadow-sm">
                        <ShoppingBag className="h-4 w-4" /> Start as Buyer
                      </Button>
                    </Link>
                    <Link href="/seller/step-1" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full h-11 rounded-xl gap-2 font-semibold border-slate-200">
                        <Store className="h-4 w-4" /> Start as Seller
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50">
                {user ? (
                  <button
                    onClick={() => { signOut(); setOpen(false); }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <Link href="/login" onClick={() => setOpen(false)} className={isLoginPage ? 'w-full' : 'flex-1'}>
                      <Button variant="outline" size="sm" className="w-full rounded-xl border-slate-200">Sign In</Button>
                    </Link>
                    {!isLoginPage && (
                      <Link href="/admin-login" onClick={() => setOpen(false)} className="flex-1">
                        <Button size="sm" className="w-full rounded-xl">Admin Login</Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      </header>
    </>
  );
}

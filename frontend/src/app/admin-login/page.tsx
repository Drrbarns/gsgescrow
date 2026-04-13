'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2, Lock, Mail, Eye, EyeOff,
  LayoutDashboard, ArrowLeftRight, Banknote, AlertTriangle, ShieldCheck, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AdminLoginPage() {
  const router = useRouter();
  const { signInWithEmail, user, loading: authLoading, profileLoaded, profile } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect to admin when auth + profile confirms admin role
  useEffect(() => {
    if (!authLoading && profileLoaded && user && (profile?.role === 'admin' || profile?.role === 'superadmin')) {
      router.push('/admin');
    }
  }, [user, authLoading, profileLoaded, profile, router]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Enter your email and password'); return; }
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Invalid credentials. Please try again.');
      return;
    }
    toast.success('Authenticated. Loading dashboard…');
    // Redirect happens via the useEffect above once profile confirms admin role
  }, [email, password, signInWithEmail]);

  const adminFeatures = [
    { icon: ArrowLeftRight, label: 'Manage all transactions in real-time' },
    { icon: Banknote, label: 'Oversee seller & rider payouts' },
    { icon: AlertTriangle, label: 'Mediate disputes instantly' },
    { icon: ShieldCheck, label: 'Approve seller verifications' },
    { icon: LayoutDashboard, label: 'Full platform analytics & reports' },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 overflow-hidden">

      {/* Left Panel — Branding */}
      <div className="hidden lg:flex w-[45%] flex-col relative overflow-hidden bg-white border-r border-slate-200">
        {/* Glow blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <BrandLogo size={40} priority />
            <span className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">Sell-Safe Buy-Safe</span>
          </Link>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-600 mb-8">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                SUPERADMIN PORTAL
              </div>
              <h1 className="text-5xl font-black tracking-tight leading-[1.1] mb-6 text-slate-900">
                Total Control.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Zero Limits.</span>
              </h1>
              <p className="text-slate-600 text-lg leading-relaxed mb-12 max-w-sm">
                Full oversight of every transaction, payout, dispute, and user across the entire Sell-Safe Buy-Safe platform.
              </p>

              <ul className="space-y-4">
                {adminFeatures.map((feature, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200">
                      <feature.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-slate-700 text-sm font-medium">{feature.label}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Footer note */}
          <p className="relative z-10 text-slate-500 text-xs font-medium">
            Restricted access. Authorised personnel only.
          </p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative">
        {/* Subtle right-panel glow */}
        <div className="absolute top-[30%] right-[20%] w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Back to site link */}
          <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium mb-10">
            <ArrowLeft className="h-4 w-4" /> Back to public site
          </Link>

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <BrandLogo size={40} priority />
            <span className="text-lg font-bold text-slate-900">Sell-Safe Buy-Safe</span>
          </div>

          {/* Form card */}
          <div className="rounded-2xl sm:rounded-3xl bg-white shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-primary to-blue-500" />

            <div className="p-5 sm:p-10">
              <div className="mb-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-5">
                  <LayoutDashboard className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">Admin Sign In</h2>
                <p className="text-slate-500 text-sm">Enter your credentials to access the control panel</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold text-xs uppercase tracking-widest">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="admin@sellsafe.gh"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 sm:h-14 pl-12 rounded-xl bg-slate-50 border-slate-200 text-slate-900 text-base font-medium placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary focus-visible:bg-white transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold text-xs uppercase tracking-widest">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 sm:h-14 pl-12 pr-12 rounded-xl bg-slate-50 border-slate-200 text-slate-900 text-base font-medium placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary focus-visible:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 sm:h-14 rounded-xl text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all mt-4"
                >
                  {loading
                    ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Authenticating…</>
                    : 'Access Control Panel'
                  }
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-sm font-medium text-slate-600">
                <span>Not an admin?</span>
                <Link href="/login" className="text-primary hover:text-primary/80 transition-colors">
                  Go to regular login →
                </Link>
              </div>
            </div>
          </div>

          <p className="text-center text-slate-500 text-xs font-medium mt-6">
            All access attempts are logged and monitored.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

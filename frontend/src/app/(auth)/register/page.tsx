'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, Mail, Lock, User, ShoppingBag, Store, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export default function RegisterPage() {
  const router = useRouter();
  const { signUpWithEmail, user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/hub');
    }
  }, [user, authLoading, router]);

  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!fullName.trim()) {
        toast.error('Enter your full name');
        return;
      }
      if (!email.trim()) {
        toast.error('Enter your email');
        return;
      }
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      setLoading(true);
      const result = await signUpWithEmail(email.trim(), password, fullName.trim(), role);
      setLoading(false);
      if (result.error) {
        toast.error(result.error.message || 'Could not create account. Try again.');
        return;
      }
      if (result.needsConfirmation) {
        toast.success('Account created! Check your email to confirm, then sign in.');
        router.push('/login');
      } else {
        toast.success('Account created! Welcome.');
        router.push(role === 'seller' ? '/seller/dashboard' : '/hub');
      }
    },
    [fullName, email, password, confirmPassword, role, signUpWithEmail, router]
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main className="flex flex-1 items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
        </div>

        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center gap-8 lg:gap-16 relative z-10 py-6 sm:py-12">
          <div className="flex-1 hidden md:block relative">
            <div className="relative w-full aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl">
              <Image
                src="/images/login-man.png"
                alt="Join Sell-Safe Buy-Safe"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <p className="text-slate-200 leading-relaxed mb-4">
                  Create a free account to start buying or selling safely. No scams, no chargebacks.
                </p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <ShoppingBag className="h-5 w-5 text-blue-400" />
                    <span>Buyers</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Store className="h-5 w-5 text-emerald-400" />
                    <span>Sellers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md">
            <div className="rounded-2xl sm:rounded-[2rem] bg-white shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="h-1.5 w-full bg-gradient-to-r from-primary to-blue-500" />
              <div className="p-5 sm:p-10">
                <div className="text-center mb-8">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-primary border border-slate-100 shadow-sm">
                    <Shield className="h-8 w-8" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">Create account</h1>
                  <p className="text-slate-500 text-sm">Join Sell-Safe Buy-Safe as a buyer or seller</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold">I want to</Label>
                    <div className="flex bg-slate-100 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setRole('buyer')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                          role === 'buyer' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Buyer
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('seller')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                          role === 'seller' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Store className="h-4 w-4" />
                        Seller
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold">Full name</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Kofi Mensah"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-14 pl-12 rounded-xl bg-slate-50 border-slate-200"
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-14 pl-12 rounded-xl bg-slate-50 border-slate-200"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-14 pl-12 pr-12 rounded-xl bg-slate-50 border-slate-200"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold">Confirm password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-14 pl-12 rounded-xl bg-slate-50 border-slate-200"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-14 rounded-xl text-base font-bold shadow-lg shadow-primary/20"
                    disabled={loading}
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating account…</>
                    ) : (
                      'Create account'
                    )}
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-600">
                  Already have an account?{' '}
                  <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
                </p>

                <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500 leading-relaxed">
                  By creating an account, you agree to our{' '}
                  <Link href="/terms" className="font-semibold text-slate-700 hover:text-primary">Terms of Service</Link>{' '}
                  and{' '}
                  <Link href="/terms#privacy" className="font-semibold text-slate-700 hover:text-primary">Privacy Policy</Link>.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

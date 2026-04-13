'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/Header';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, KeyRound, ArrowLeft, Loader2, ShieldCheck, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

type Step = 'phone' | 'otp';
type LoginMode = 'phone' | 'email';

export default function LoginPage() {
  const router = useRouter();
  const { signInWithOtp, verifyOtp, signInWithEmail, user, loading: authLoading } = useAuth();

  // Redirect once auth state confirms sign-in success
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/hub');
    }
  }, [user, authLoading, router]);

  const [mode, setMode] = useState<LoginMode>('phone');

  // Phone OTP state
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const fullPhone = `+233${phone.replace(/^0+/, '')}`;

  const handleSendOtp = useCallback(async () => {
    const cleaned = phone.replace(/^0+/, '').replace(/\s/g, '');
    if (cleaned.length < 9 || cleaned.length > 10) {
      toast.error('Enter a valid Ghanaian phone number');
      return;
    }
    setLoading(true);
    const { error } = await signInWithOtp(fullPhone);
    setLoading(false);
    if (error) { toast.error(error.message || 'Failed to send OTP. Try again.'); return; }
    toast.success('OTP sent! Check your phone.');
    setStep('otp');
  }, [phone, fullPhone, signInWithOtp]);

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setLoading(true);
    const { error } = await verifyOtp(fullPhone, otp);
    setLoading(false);
    if (error) { toast.error(error.message || 'Invalid code. Please try again.'); return; }
    toast.success('Welcome back!');
  }, [otp, fullPhone, verifyOtp]);

  const handleEmailLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Enter your email and password'); return; }
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) { toast.error(error.message || 'Invalid email or password.'); return; }
    toast.success('Welcome back!');
  }, [email, password, signInWithEmail]);

  function switchMode(newMode: LoginMode) {
    setMode(newMode);
    setStep('phone');
    setPhone('');
    setOtp('');
    setEmail('');
    setPassword('');
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <main className="flex flex-1 items-center justify-center p-4 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
        </div>

        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center gap-8 lg:gap-16 relative z-10 py-6 sm:py-12">

          {/* Left Side: Image + Value Prop */}
          <div className="flex-1 hidden md:block relative">
            <div className="relative w-full aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl">
              <Image
                src="/images/login-man.png"
                alt="African Professional using phone"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold backdrop-blur-md border border-white/20 mb-4"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Licensed and Secure PSPs</span>
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl font-extrabold tracking-tight mb-3"
                >
                  Secure Every <br /><span className="text-blue-400">Transaction.</span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-slate-200 leading-relaxed"
                >
                  Join thousands of Ghanaians buying and selling online with zero risk. Funds held securely until delivery is confirmed.
                </motion.p>
              </div>
            </div>
          </div>

          {/* Right Side: Auth Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-md"
          >
            <div className="rounded-[2rem] bg-white shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              {/* Top gradient bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-primary" />

              <div className="p-8 sm:p-10">

                {/* Logo + Title */}
                <div className="text-center mb-8">
                  <div className="mx-auto mb-5 flex items-center justify-center">
                    <BrandLogo size={64} priority />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome Back</h1>
                  <p className="text-slate-500 text-sm">Sign in to your Sell-Safe Buy-Safe account</p>
                </div>

                {/* Mode Toggle Tabs */}
                <div className="flex bg-slate-100 rounded-xl p-1 mb-8">
                  <button
                    onClick={() => switchMode('phone')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                      mode === 'phone'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Phone className="h-4 w-4" />
                    Phone OTP
                  </button>
                    <button
                    onClick={() => switchMode('email')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                      mode === 'email'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </button>
                </div>

                <AnimatePresence mode="wait">

                  {/* ─── PHONE OTP MODE ─── */}
                  {mode === 'phone' && (
                    <motion.div
                      key="phone-mode"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <AnimatePresence mode="wait">
                        {step === 'phone' ? (
                          <motion.form
                            key="phone-step"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }}
                            className="space-y-5"
                          >
                            <div className="space-y-2">
                              <Label className="text-slate-700 font-semibold">Phone Number</Label>
                              <div className="flex gap-2">
                                <div className="flex h-14 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-700 font-bold shrink-0">
                                  +233
                                </div>
                                <div className="relative flex-1">
                                  <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                  <Input
                                    type="tel"
                                    inputMode="numeric"
                                    placeholder="24 123 4567"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                                    className="h-14 pl-12 rounded-xl bg-slate-50 border-slate-200 text-lg font-bold focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                                    maxLength={12}
                                    autoFocus
                                  />
                                </div>
                              </div>
                            </div>
                            <Button type="submit" className="w-full h-14 rounded-xl text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" disabled={loading}>
                              {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending Code…</> : 'Get OTP Code'}
                            </Button>
                          </motion.form>
                        ) : (
                          <motion.form
                            key="otp-step"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }}
                            className="space-y-5"
                          >
                            <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100 mb-2">
                              <p className="text-sm font-medium text-blue-800">Code sent to <span className="font-bold">+233 {phone.replace(/^0+/, '')}</span></p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-slate-700 font-semibold">6-Digit Code</Label>
                              <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="• • • • • •"
                                  value={otp}
                                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                  className="h-14 pl-12 rounded-xl bg-slate-50 border-slate-200 text-center text-2xl tracking-[0.5em] font-bold focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                                  maxLength={6}
                                  autoFocus
                                />
                              </div>
                            </div>
                            <Button type="submit" className="w-full h-14 rounded-xl text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" disabled={loading}>
                              {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying…</> : 'Verify & Sign In'}
                            </Button>
                            <div className="flex items-center justify-between text-sm font-medium">
                              <button type="button" onClick={() => { setStep('phone'); setOtp(''); }} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors">
                                <ArrowLeft className="h-4 w-4" /> Change number
                              </button>
                              <button type="button" onClick={handleSendOtp} disabled={loading} className="text-primary hover:text-primary/80 transition-colors">
                                Resend code
                              </button>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {/* ─── EMAIL / PASSWORD MODE ─── */}
                  {mode === 'email' && (
                    <motion.form
                      key="email-mode"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      onSubmit={handleEmailLogin}
                      className="space-y-5"
                    >
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-semibold">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-14 pl-12 rounded-xl bg-slate-50 border-slate-200 text-base font-medium focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-700 font-semibold">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-14 pl-12 pr-12 rounded-xl bg-slate-50 border-slate-200 text-base font-medium focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
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

                      <Button type="submit" className="w-full h-14 rounded-xl text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" disabled={loading}>
                        {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signing In…</> : 'Sign In'}
                      </Button>
                    </motion.form>
                  )}

                </AnimatePresence>

                <p className="mt-6 text-center text-sm text-slate-600">
                  Don&apos;t have an account?{' '}
                  <Link href="/register" className="font-semibold text-primary hover:underline">Create account</Link>
                </p>

                {/* Footer */}
                <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500 leading-relaxed">
                  By continuing, you agree to our{' '}
                  <Link href="/terms" className="font-semibold text-slate-700 hover:text-primary transition-colors">Terms of Service</Link>{' '}
                  and{' '}
                  <Link href="/terms#privacy" className="font-semibold text-slate-700 hover:text-primary transition-colors">Privacy Policy</Link>.
                </div>

              </div>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, ShoppingBag, Store, Phone, KeyRound, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export default function RegisterPage() {
  const router = useRouter();
  const { signInWithOtp, verifyOtp, user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/hub');
    }
  }, [user, authLoading, router]);

  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const fullPhone = `+233${phone.replace(/^0+/, '').replace(/\s/g, '')}`;

  const handleSendOtp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Enter your full name');
      return;
    }
    const cleaned = phone.replace(/^0+/, '').replace(/\s/g, '');
    if (cleaned.length < 9 || cleaned.length > 10) {
      toast.error('Enter a valid Ghanaian phone number');
      return;
    }
    setLoading(true);
    const result = await signInWithOtp(fullPhone);
    setLoading(false);
    if (result.error) {
      toast.error(result.error.message || 'Failed to send OTP. Try again.');
      return;
    }
    toast.success('OTP sent! Enter the code to complete signup.');
    setStep('otp');
  }, [fullName, phone, fullPhone, signInWithOtp]);

  const handleVerifyOtp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    const result = await verifyOtp(fullPhone, otp);
    if (result.error) {
      setLoading(false);
      toast.error(result.error.message || 'Invalid OTP code');
      return;
    }

    try {
      await api.createProfile({ full_name: fullName.trim(), role });
    } catch {
      // best effort; profile trigger might already exist
    }

    setLoading(false);
    toast.success('Account created and verified by SMS.');
    router.push(role === 'seller' ? '/seller/dashboard' : '/hub');
  }, [otp, fullPhone, verifyOtp, fullName, role, router]);

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
                  <div className="mx-auto mb-5 flex items-center justify-center">
                    <BrandLogo size={64} priority />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">Create account</h1>
                  <p className="text-slate-500 text-sm">Sign up with your phone number and verify by SMS</p>
                </div>

                <form onSubmit={step === 'phone' ? handleSendOtp : handleVerifyOtp} className="space-y-5">
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

                  {step === 'phone' ? (
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold">Phone number</Label>
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
                            className="h-14 pl-12 rounded-xl bg-slate-50 border-slate-200"
                            maxLength={12}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold">6-digit OTP</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="123456"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="h-14 pl-12 rounded-xl bg-slate-50 border-slate-200 tracking-[0.25em] text-center text-xl"
                          maxLength={6}
                        />
                      </div>
                      <p className="text-xs text-slate-500">Code sent to +233 {phone.replace(/^0+/, '').replace(/\s/g, '')}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-14 rounded-xl text-base font-bold shadow-lg shadow-primary/20"
                    disabled={loading}
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing…</>
                    ) : (
                      step === 'phone' ? 'Send OTP' : 'Verify & Create Account'
                    )}
                  </Button>
                  {step === 'otp' && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 rounded-xl"
                      onClick={() => {
                        setStep('phone');
                        setOtp('');
                      }}
                      disabled={loading}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Change Number
                    </Button>
                  )}
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
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SellerVerifyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [existing, setExisting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [ghanaCard, setGhanaCard] = useState('');
  const [tin, setTin] = useState('');
  const [location, setLocation] = useState('');
  const [socials, setSocials] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      api.getVerificationStatus()
        .then(res => setExisting(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user]);

  async function handleSubmit() {
    if (!businessName || !location) { toast.error('Business name and location are required'); return; }
    setSubmitting(true);
    try {
      await api.submitSellerVerification({
        business_name: businessName,
        business_type: businessType || undefined,
        ghana_card_number: ghanaCard || undefined,
        tin_number: tin || undefined,
        business_location: location,
        social_links: socials ? { links: socials } : undefined,
      });
      toast.success('Verification submitted! We\'ll review it within 24-48 hours.');
      router.push('/seller/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (existing?.status === 'APPROVED') {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-lg px-4 py-16">
          <Card className="border-green-200 bg-green-50 text-center rounded-2xl">
            <CardHeader>
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-600 mb-4" />
              <CardTitle className="text-green-800">You're Verified!</CardTitle>
              <CardDescription className="text-green-700">Your seller account is verified. Your trust badge is displayed to all buyers.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/seller/dashboard')} className="rounded-full">Back to Dashboard</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  if (existing?.status === 'PENDING') {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-lg px-4 py-16">
          <Card className="border-amber-200 bg-amber-50 text-center rounded-2xl">
            <CardHeader>
              <Clock className="mx-auto h-16 w-16 text-amber-600 mb-4" />
              <CardTitle className="text-amber-800">Verification Pending</CardTitle>
              <CardDescription className="text-amber-700">Your verification is being reviewed. This usually takes 24-48 hours.</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge className="bg-amber-100 text-amber-800">Submitted: {new Date(existing.created_at).toLocaleDateString()}</Badge>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary mb-4" />
          <h1 className="text-2xl font-bold">Get Verified</h1>
          <p className="text-muted-foreground mt-2">
            Verified sellers get a trust badge, higher visibility, and increased buyer confidence.
            Verification is free and takes 24-48 hours.
          </p>
        </div>

        <Card className="rounded-2xl">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Business Name *</Label>
              <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Your business or brand name" />
            </div>
            <div className="space-y-2">
              <Label>Business Type</Label>
              <Input value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="e.g. Electronics, Fashion, Food..." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Ghana Card Number</Label>
                <Input value={ghanaCard} onChange={e => setGhanaCard(e.target.value)} placeholder="GHA-XXXXXXXXX-X" />
              </div>
              <div className="space-y-2">
                <Label>TIN Number</Label>
                <Input value={tin} onChange={e => setTin(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Business Location *</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Your shop/office address" />
            </div>
            <div className="space-y-2">
              <Label>Social Media Links</Label>
              <Textarea value={socials} onChange={e => setSocials(e.target.value)} placeholder="Instagram, Facebook, TikTok URLs (one per line)" />
            </div>

            <Button onClick={handleSubmit} disabled={submitting} size="lg" className="w-full rounded-full">
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit for Verification'}
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}

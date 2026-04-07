'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BuyerVerifyPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [existing, setExisting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState('');
  const [idType, setIdType] = useState('ghana_card');
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('Ghana');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    setFullName(profile?.full_name || '');
    api.getBuyerVerificationStatus()
      .then((res) => setExisting(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, profile]);

  async function handleSubmit() {
    if (!fullName.trim() || !idNumber.trim() || !address.trim()) {
      toast.error('Full name, ID number and address are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.submitBuyerVerification({
        full_name: fullName.trim(),
        id_type: idType,
        id_number: idNumber.trim(),
        address: address.trim(),
        country: country.trim() || 'Ghana',
        notes: notes.trim() || undefined,
      });
      toast.success('KYC submitted. We will review and update your status soon.');
      router.push('/hub');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit KYC');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (existing?.status === 'APPROVED') {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-lg px-4 py-10 sm:py-16">
          <Card className="rounded-2xl border-green-200 bg-green-50 text-center">
            <CardHeader>
              <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-green-600" />
              <CardTitle className="text-2xl text-green-800">KYC Approved</CardTitle>
              <CardDescription className="text-green-700">Your buyer account is fully verified.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/hub')} className="rounded-full">Back to Hub</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  if (existing?.status === 'PENDING' || existing?.status === 'UNDER_REVIEW') {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-lg px-4 py-10 sm:py-16">
          <Card className="rounded-2xl border-amber-200 bg-amber-50 text-center">
            <CardHeader>
              <Clock className="mx-auto mb-3 h-14 w-14 text-amber-600" />
              <CardTitle className="text-2xl text-amber-800">KYC In Review</CardTitle>
              <CardDescription className="text-amber-700">Your KYC is pending admin review.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Badge className="bg-amber-100 text-amber-800">Status: {existing.status}</Badge>
              <p className="text-xs text-amber-700">Submitted {new Date(existing.created_at).toLocaleString()}</p>
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
        <div className="mb-6 text-center">
          <ShieldCheck className="mx-auto mb-3 h-11 w-11 text-primary" />
          <h1 className="text-2xl font-bold">Buyer KYC Verification</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete KYC to unlock higher trust limits and improved account protection.
          </p>
        </div>
        <Card className="rounded-2xl">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Legal full name" className="h-12 rounded-xl" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>ID Type *</Label>
                <Input value={idType} onChange={(e) => setIdType(e.target.value)} placeholder="ghana_card" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>ID Number *</Label>
                <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="GHA-XXXXXXXXX-X" className="h-12 rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address *</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Your residential address" className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Ghana" className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any context for reviewers" className="min-h-[100px] rounded-xl" />
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="h-12 w-full rounded-full">
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Buyer KYC'}
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}


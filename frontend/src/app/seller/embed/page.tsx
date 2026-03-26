'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Code, Copy, Check, Link as LinkIcon, ExternalLink, Shield, Instagram, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export default function SellerEmbedPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [copied, setCopied] = useState<string>('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  const phone = profile?.phone || '';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sellbuysafe.gsgbrands.com.gh';
  const badgeUrl = `${baseUrl}/badge/${encodeURIComponent(phone)}`;
  const buyUrl = `${baseUrl}/buyer/step-1?seller_phone=${encodeURIComponent(phone)}`;

  const embedCode = `<a href="${badgeUrl}" target="_blank" rel="noopener" style="display:inline-block;background:linear-gradient(135deg,#6b21a8,#9333ea);color:white;padding:10px 20px;border-radius:24px;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;text-decoration:none;transition:all .2s">🛡️ Buy Safely via PSPs</a>`;

  const whatsAppBioLink = `✅ I use secure PSP protection\n🛡️ Pay safely: ${badgeUrl}`;

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(''), 2000);
  }

  if (loading) return null;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8 text-center">
          <Code className="mx-auto h-8 w-8 sm:h-10 sm:w-10 text-primary mb-3" />
          <h1 className="text-xl sm:text-2xl font-bold">Seller Badge & Links</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">Share these across your social media and bio to build buyer trust.</p>
        </div>

        <div className="grid gap-4 sm:gap-6">
          {/* Badge Preview */}
          <Card className="rounded-xl sm:rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Shield className="h-5 w-5 text-primary" /> Your Trust Badge</CardTitle>
              <CardDescription className="text-sm">Share this page link with buyers to show your verified reputation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 px-4 sm:px-6">
              <div className="rounded-xl border bg-muted/50 p-3 sm:p-4 overflow-hidden">
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Badge Page URL</Label>
                <div className="flex items-center gap-2">
                  <Input value={badgeUrl} readOnly className="font-mono text-xs min-w-0" />
                  <Button variant="outline" size="sm" onClick={() => handleCopy(badgeUrl, 'Badge URL')} className="shrink-0">
                    {copied === 'Badge URL' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2 rounded-full w-full sm:w-auto" onClick={() => window.open(badgeUrl, '_blank')}>
                  <ExternalLink className="h-3.5 w-3.5" /> Preview Badge
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Buy Link */}
          <Card className="rounded-xl sm:rounded-2xl">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><LinkIcon className="h-5 w-5 text-primary" /> Quick Buy Link</CardTitle>
              <CardDescription className="text-sm">Buyers click this link to start a transaction with your phone number pre-filled.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div className="flex items-center gap-2">
                <Input value={buyUrl} readOnly className="font-mono text-xs min-w-0" />
                <Button variant="outline" size="sm" onClick={() => handleCopy(buyUrl, 'Buy Link')} className="shrink-0">
                  {copied === 'Buy Link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Embeddable HTML */}
          <Card className="rounded-xl sm:rounded-2xl">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Code className="h-5 w-5 text-primary" /> Embed Code</CardTitle>
              <CardDescription className="text-sm">Add this button to your website, blog, or link-in-bio page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div className="rounded-xl bg-gray-900 p-3 sm:p-4 overflow-x-auto max-w-full">
                <code className="text-xs text-green-400 whitespace-pre-wrap break-all">{embedCode}</code>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleCopy(embedCode, 'Embed Code')} className="rounded-full gap-2 w-full sm:w-auto">
                  {copied === 'Embed Code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy HTML
                </Button>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 sm:p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <a href={badgeUrl} target="_blank" rel="noopener"
                  style={{ display: 'inline-block', background: 'linear-gradient(135deg,#6b21a8,#9333ea)', color: 'white', padding: '10px 20px', borderRadius: '24px', fontFamily: 'system-ui,sans-serif', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
                  🛡️ Buy Safely via PSPs
                </a>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp / Instagram Bio Text */}
          <Card className="rounded-xl sm:rounded-2xl">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Smartphone className="h-5 w-5 text-primary" /> Bio Text</CardTitle>
              <CardDescription className="text-sm">Add this text to your WhatsApp status, Instagram bio, or TikTok profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div className="rounded-xl bg-muted/50 p-3 sm:p-4 overflow-hidden">
                <pre className="text-sm whitespace-pre-wrap break-all">{whatsAppBioLink}</pre>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleCopy(whatsAppBioLink, 'Bio Text')} className="rounded-full gap-2 w-full sm:w-auto">
                {copied === 'Bio Text' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy Bio Text
              </Button>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="rounded-xl sm:rounded-2xl border-primary/20 bg-primary/5">
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
              <h3 className="font-bold mb-3 text-base sm:text-lg">Tips for Maximum Trust</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><Badge className="mt-0.5 bg-primary text-primary-foreground shrink-0">1</Badge> Add your badge link to your Instagram, Facebook, and TikTok bio.</li>
                <li className="flex items-start gap-2"><Badge className="mt-0.5 bg-primary text-primary-foreground shrink-0">2</Badge> Share the quick buy link when closing deals in DMs.</li>
                <li className="flex items-start gap-2"><Badge className="mt-0.5 bg-primary text-primary-foreground shrink-0">3</Badge> Get verified to unlock the verified badge and higher trust scores.</li>
                <li className="flex items-start gap-2"><Badge className="mt-0.5 bg-primary text-primary-foreground shrink-0">4</Badge> Complete more transactions to climb from Bronze to Platinum tier.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}

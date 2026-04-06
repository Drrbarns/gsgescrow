import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from '@/components/ui/sonner';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';
import { SimulationBanner } from '@/components/shared/SimulationBanner';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const siteUrl =
  configuredAppUrl &&
  /^https?:\/\//.test(configuredAppUrl) &&
  !configuredAppUrl.includes('localhost')
    ? configuredAppUrl
    : 'https://sellbuysafe.gsgbrands.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Sell-Safe Buy-Safe | Secure Every Transaction',
    template: '%s | Sell-Safe Buy-Safe',
  },
  description:
    'Sell-Safe Buy-Safe helps buyers and sellers in Ghana complete secure transactions with licensed PSP protection, delivery verification, and payout safety.',
  keywords: [
    'Sell-Safe Buy-Safe',
    'secure transactions Ghana',
    'buyer protection Ghana',
    'seller protection Ghana',
    'licensed PSP payments',
    'safe online shopping Ghana',
    'safe online selling Ghana',
    'delivery verification',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Sell-Safe Buy-Safe | Secure Every Transaction',
    description:
      'Protect every deal with licensed PSP security, transaction tracking, and trusted payout workflows for online buyers and sellers in Ghana.',
    siteName: 'Sell-Safe Buy-Safe',
    locale: 'en_GH',
    images: [
      {
        url: '/images/social-share-gsg.png',
        width: 1024,
        height: 683,
        alt: 'GSG Brands',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sell-Safe Buy-Safe | Secure Every Transaction',
    description:
      'Secure online buying and selling in Ghana with licensed PSP protection and delivery-verified payout flow.',
    images: ['/images/social-share-gsg.png'],
  },
  icons: {
    icon: [{ url: '/icon', type: 'image/png' }],
    apple: [{ url: '/apple-icon', type: 'image/png' }],
    shortcut: ['/icon'],
  },
  manifest: '/manifest.json',
  category: 'finance',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <SimulationBanner />
          <OfflineIndicator />
          {children}
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}

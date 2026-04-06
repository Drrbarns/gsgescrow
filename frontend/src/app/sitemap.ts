import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sellbuysafe.gsgbrands.com';

  const routes = [
    '',
    '/login',
    '/register',
    '/hub',
    '/tracking',
    '/calculator',
    '/protection',
    '/seller-protection',
    '/platform-limitations',
    '/reviews',
    '/terms',
    '/buyer/step-1',
    '/buyer/step-2',
    '/seller/step-1',
    '/seller/step-2',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : 0.7,
  }));
}

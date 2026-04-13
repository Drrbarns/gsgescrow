'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { ArrowRight, Filter, ShieldCheck, Store, Tag } from 'lucide-react';

const PAGE_SIZE = 18;

export default function ProductsServicesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, categoryFilter, sort]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listMarketplaceListings({
        page: String(page),
        limit: String(PAGE_SIZE),
        type: typeFilter === 'all' ? '' : typeFilter,
        category: categoryFilter === 'all' ? '' : categoryFilter,
        search: debouncedSearch,
        sort,
      })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data || []);
        setTotal(res.total || 0);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Failed to load marketplace listings');
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, typeFilter, categoryFilter, debouncedSearch, sort]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.category) set.add(String(item.category));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleBuy = (listing: any) => {
    if (!user) {
      router.push('/login');
      return;
    }
    const params = new URLSearchParams({
      listing_id: listing.id,
      listing_type: listing.listing_type || 'product',
      product_name: listing.title || '',
      seller_name: listing.seller?.full_name || '',
      seller_phone: listing.seller?.phone || '',
      product_total: String(listing.price || 0),
      listing_link: `marketplace:${listing.id}`,
      source_platform: 'website',
    });
    router.push(`/buyer/step-1?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-slate-200 bg-white">
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/images/hero-woman.png')" }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/95 via-white/90 to-white/75" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(99,102,241,0.10),transparent_45%)]" />

          <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/85 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-sm">
                <ShieldCheck className="h-3.5 w-3.5" />
                Escrow-Protected Marketplace
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Products & Services</h1>
              <p className="mt-2 text-sm text-slate-700 sm:text-base">
                Discover seller listings and purchase through the same secure escrow flow.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="sm:col-span-2">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search products or services..."
                    className="h-10 bg-slate-50"
                  />
                </div>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v || 'all')}>
                  <SelectTrigger className="h-10 bg-slate-50">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="product">Products</SelectItem>
                    <SelectItem value="service">Services</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v || 'all')}>
                  <SelectTrigger className="h-10 bg-slate-50">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(v) => setSort(v || 'newest')}>
                  <SelectTrigger className="h-10 bg-slate-50">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Filter className="h-3.5 w-3.5" />
                Mixed default feed of products and services
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading &&
              Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="rounded-2xl border-slate-200 bg-white">
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="mt-2 h-4 w-full" />
                    <Skeleton className="mt-4 h-8 w-1/2" />
                  </CardContent>
                </Card>
              ))}

            {!loading &&
              items.map((listing) => (
                <Card key={listing.id} className="rounded-2xl border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="p-4">
                    {listing.cover_image_url ? (
                      <div
                        className="mb-3 h-40 w-full rounded-xl border border-slate-200 bg-cover bg-center"
                        style={{ backgroundImage: `url(${listing.cover_image_url})` }}
                      />
                    ) : null}
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary">
                        {listing.listing_type === 'service' ? 'Service' : 'Product'}
                      </Badge>
                      <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-600">
                        {listing.category || 'General'}
                      </Badge>
                    </div>
                    <h3 className="mt-3 line-clamp-2 text-lg font-bold text-slate-900">{listing.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{listing.description || 'No description provided yet.'}</p>

                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                      <Store className="h-3.5 w-3.5" />
                      <span>{listing.seller?.full_name || 'Verified seller'}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <Tag className="h-3.5 w-3.5" />
                      <span>{listing.location_text || 'Ghana'}</span>
                    </div>

                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Starting at</p>
                        <p className="text-2xl font-black text-slate-900">GHS {Number(listing.price || 0).toFixed(2)}</p>
                      </div>
                      <Button className="rounded-full" onClick={() => handleBuy(listing)}>
                        Buy with Escrow <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          {!loading && items.length === 0 && (
            <Card className="mt-6 rounded-2xl border-slate-200 bg-white">
              <CardContent className="py-12 text-center">
                <p className="text-base font-semibold text-slate-800">No listings found</p>
                <p className="mt-1 text-sm text-slate-500">Try changing your filters or search query.</p>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing page {page} of {pages} ({total} listings)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-slate-500">
            Want to sell here?{' '}
            <Link className="font-semibold text-primary hover:underline" href="/seller/dashboard">
              Open Seller Dashboard
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

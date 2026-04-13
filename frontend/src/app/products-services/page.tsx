'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { ArrowRight, Filter, ShieldCheck, Store, Tag, Search, ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-slate-950">
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
            style={{ backgroundImage: "url('/images/hero-woman.png')" }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(99,102,241,0.20),transparent_45%)]" />

          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/20 px-4 py-1.5 text-xs font-bold tracking-wide text-primary-foreground backdrop-blur-sm">
                <ShieldCheck className="h-4 w-4" />
                Secure Payment Marketplace
              </div>
              <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-6xl">Products & Services</h1>
              <p className="mt-4 text-base text-slate-400 sm:text-lg max-w-xl leading-relaxed">
                Discover verified seller listings and purchase through our secure payment protection flow. Your money is protected until delivery is confirmed.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 -mt-8 relative z-10">
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xl shadow-slate-200/40 mb-8 sm:mb-12">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="sm:col-span-2 relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products or services..."
                  className="h-12 sm:h-14 rounded-xl border-slate-200 bg-slate-50 pl-12 text-base focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v || 'all')}>
                <SelectTrigger className="h-12 sm:h-14 rounded-xl border-slate-200 bg-slate-50 text-base">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="product">Products</SelectItem>
                  <SelectItem value="service">Services</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v || 'all')}>
                <SelectTrigger className="h-12 sm:h-14 rounded-xl border-slate-200 bg-slate-50 text-base">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v || 'newest')}>
                <SelectTrigger className="h-12 sm:h-14 rounded-xl border-slate-200 bg-slate-50 text-base">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-500 px-1">
              <Filter className="h-4 w-4" />
              Showing {total} verified listings
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading &&
              Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Skeleton className="h-48 w-full rounded-2xl" />
                  <Skeleton className="mt-5 h-6 w-3/4" />
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-2/3" />
                  <div className="mt-6 flex items-center justify-between">
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-10 w-1/3 rounded-full" />
                  </div>
                </div>
              ))}

            <AnimatePresence mode="popLayout">
              {!loading &&
                items.map((listing, idx) => (
                  <motion.div 
                    key={listing.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 hover:border-primary/30"
                  >
                    {listing.cover_image_url ? (
                      <div
                        className="mb-5 h-48 w-full rounded-2xl border border-slate-100 bg-cover bg-center bg-slate-50 relative overflow-hidden"
                        style={{ backgroundImage: `url(${listing.cover_image_url})` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ) : (
                      <div className="mb-5 h-48 w-full rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-center">
                        <Store className="h-12 w-12 text-slate-300" />
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary font-bold px-2.5 py-0.5 text-[10px] uppercase tracking-wider">
                        {listing.listing_type === 'service' ? 'Service' : 'Product'}
                      </Badge>
                      <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-600 font-bold px-2.5 py-0.5 text-[10px] uppercase tracking-wider">
                        {listing.category || 'General'}
                      </Badge>
                    </div>
                    
                    <h3 className="line-clamp-2 text-xl font-bold text-slate-900 leading-tight mb-2 group-hover:text-primary transition-colors">{listing.title}</h3>
                    <p className="line-clamp-2 text-sm text-slate-500 mb-4 flex-1 leading-relaxed">{listing.description || 'No description provided yet.'}</p>

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                        <Store className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{listing.seller?.full_name || 'Verified seller'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                        <Tag className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{listing.location_text || 'Ghana'}</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-5 border-t border-slate-100 flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Price</p>
                        <p className="text-2xl font-black text-slate-900">GHS {Number(listing.price || 0).toFixed(2)}</p>
                      </div>
                      <Button className="rounded-xl h-11 px-5 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" onClick={() => handleBuy(listing)}>
                        Buy <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>

          {!loading && items.length === 0 && (
            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 mb-6">
                <PackageSearch className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">No listings found</h3>
              <p className="text-base text-slate-500 max-w-md mx-auto mb-8">We couldn't find any products or services matching your current filters. Try adjusting your search.</p>
              <Button variant="outline" onClick={() => { setSearch(''); setDebouncedSearch(''); setTypeFilter('all'); setCategoryFilter('all'); }} className="rounded-xl h-12 px-8 font-bold">
                Clear all filters
              </Button>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-8">
              <p className="text-sm font-medium text-slate-500">
                Showing page <span className="font-bold text-slate-900">{page}</span> of {pages}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="rounded-xl h-11 w-11 p-0" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button variant="outline" className="rounded-xl h-11 w-11 p-0" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          <div className="mt-16 text-center">
            <p className="text-sm font-medium text-slate-500 bg-white inline-flex items-center gap-2 px-6 py-3 rounded-full border border-slate-200 shadow-sm">
              Want to sell your products here?{' '}
              <Link className="font-bold text-primary hover:text-primary/80 transition-colors" href="/seller/dashboard">
                Open Seller Dashboard <ArrowRight className="inline h-4 w-4 ml-1" />
              </Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { createClient as createSupabaseClient } from '@/lib/supabase/browser';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  BarChart3,
  Bell,
  Boxes,
  CreditCard,
  LayoutDashboard,
  Package,
  Plus,
  ShieldCheck,
  Store,
  Wallet,
} from 'lucide-react';

type SellerView = 'overview' | 'listings' | 'orders' | 'payouts' | 'reputation' | 'notifications';

const sellerViews: Array<{ id: SellerView; label: string; icon: any }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'listings', label: 'Listings', icon: Boxes },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'payouts', label: 'Payouts', icon: Wallet },
  { id: 'reputation', label: 'Reputation & KYC', icon: ShieldCheck },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

const defaultListingForm = {
  listing_type: 'product',
  title: '',
  description: '',
  category: '',
  price: '',
  location_text: '',
  status: 'PUBLISHED',
  cover_image_url: '',
};

export default function SellerDashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [activeView, setActiveView] = useState<SellerView>('overview');
  const [loading, setLoading] = useState(true);
  const [savingListing, setSavingListing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [analytics, setAnalytics] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [verification, setVerification] = useState<any>(null);

  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [listingForm, setListingForm] = useState(defaultListingForm);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [analyticsRes, listingsRes, ordersRes, payoutsRes, notificationsRes, verificationRes] = await Promise.all([
        api.getSellerAnalytics(),
        api.listMyMarketplaceListings({ page: '1', limit: '50' }),
        api.listTransactions({ page: '1', limit: '50' }),
        api.listPayouts({ page: '1', limit: '50' }),
        api.getNotifications(),
        api.getVerificationStatus(),
      ]);
      setAnalytics(analyticsRes.data || null);
      setListings(listingsRes.data || []);
      setOrders(ordersRes.data || []);
      setPayouts(payoutsRes.data || []);
      setNotifications(notificationsRes.data || []);
      setVerification(verificationRes.data || null);
    } catch {
      toast.error('Failed to load seller dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user]);

  const metrics = useMemo(() => {
    const totalRevenue = Number(analytics?.total_revenue || 0);
    const totalTransactions = Number(analytics?.total_transactions || 0);
    const avgRating = Number(analytics?.avg_rating || 0);
    const listingCount = listings.length;
    return { totalRevenue, totalTransactions, avgRating, listingCount };
  }, [analytics, listings]);

  const resetListingForm = () => {
    setListingForm(defaultListingForm);
    setEditingListingId(null);
  };

  const handleSaveListing = async () => {
    if (!listingForm.title.trim()) {
      toast.error('Listing title is required');
      return;
    }
    if (!listingForm.price || Number(listingForm.price) < 0) {
      toast.error('Please enter a valid listing price');
      return;
    }
    setSavingListing(true);
    try {
      const payload = {
        listing_type: listingForm.listing_type,
        title: listingForm.title.trim(),
        description: listingForm.description.trim() || null,
        category: listingForm.category.trim() || null,
        price: Number(listingForm.price),
        location_text: listingForm.location_text.trim() || null,
        status: listingForm.status,
        cover_image_url: listingForm.cover_image_url?.trim() || null,
      };
      if (editingListingId) {
        await api.updateMarketplaceListing(editingListingId, payload);
        toast.success('Listing updated');
      } else {
        await api.createMarketplaceListing(payload);
        toast.success('Listing created');
      }
      resetListingForm();
      await loadDashboard();
      setActiveView('listings');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save listing');
    } finally {
      setSavingListing(false);
    }
  };

  const handleEditListing = (listing: any) => {
    setEditingListingId(listing.id);
    setListingForm({
      listing_type: listing.listing_type || 'product',
      title: listing.title || '',
      description: listing.description || '',
      category: listing.category || '',
      price: String(listing.price || ''),
      location_text: listing.location_text || '',
      status: listing.status || 'PUBLISHED',
      cover_image_url: listing.cover_image_url || '',
    });
    setActiveView('listings');
  };

  const handleChangeListingStatus = async (id: string, status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED') => {
    try {
      await api.updateMarketplaceListingStatus(id, status);
      toast.success(`Listing moved to ${status}`);
      await loadDashboard();
    } catch {
      toast.error('Failed to update listing status');
    }
  };

  const markNotificationsRead = async () => {
    try {
      await api.markNotificationsReadAll();
      toast.success('All notifications marked as read');
      await loadDashboard();
    } catch {
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleUploadListingImage = async (file?: File | null) => {
    if (!file || !user) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error('Please upload JPG, PNG, WEBP, or GIF');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5MB or less');
      return;
    }

    setUploadingImage(true);
    try {
      const supabase = createSupabaseClient();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('marketplace-assets').upload(filePath, file, {
        upsert: false,
        cacheControl: '3600',
      });
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from('marketplace-assets').getPublicUrl(filePath);
      if (!data?.publicUrl) throw new Error('Failed to get uploaded image URL');
      setListingForm((s) => ({ ...s, cover_image_url: data.publicUrl }));
      toast.success('Image uploaded');
    } catch (err: any) {
      toast.error(err?.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr] lg:py-8">
          <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="rounded-2xl bg-slate-900 px-4 py-5 text-white">
              <p className="text-xs uppercase tracking-wider text-slate-300">Seller Control Plane</p>
              <h2 className="mt-1 text-xl font-black">{profile?.full_name || 'Seller'}</h2>
              <p className="mt-1 text-xs text-slate-300">Manage listings, orders, payouts, and reputation.</p>
            </div>
            <div className="mt-3 space-y-1">
              {sellerViews.map((view) => (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                    activeView === view.id ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <view.icon className="h-4 w-4" />
                    {view.label}
                  </span>
                </button>
              ))}
          </div>
            <div className="mt-4 space-y-2">
              <Link href="/seller/step-1">
                <Button className="w-full rounded-xl">Open Seller Orders</Button>
              </Link>
              <Link href="/products-services">
                <Button variant="outline" className="w-full rounded-xl">
                  View Marketplace
              </Button>
            </Link>
          </div>
          </aside>

          <section className="space-y-5">
            {activeView === 'overview' && (
              <>
                <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Overview</p>
                        <h1 className="mt-1 text-3xl font-black text-slate-900">Seller Performance Dashboard</h1>
                        <p className="mt-1 text-sm text-slate-600">A command center for your escrow-powered storefront.</p>
                  </div>
                      <Button className="rounded-full" onClick={() => setActiveView('listings')}>
                        <Plus className="mr-1 h-4 w-4" />
                        New Listing
                      </Button>
                  </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard title="Revenue" value={`GHS ${metrics.totalRevenue.toFixed(2)}`} icon={CreditCard} />
                  <MetricCard title="Transactions" value={String(metrics.totalTransactions)} icon={Package} />
                  <MetricCard title="Average Rating" value={metrics.avgRating > 0 ? metrics.avgRating.toFixed(1) : 'N/A'} icon={BarChart3} />
                  <MetricCard title="Active Listings" value={String(listings.filter((l) => l.status === 'PUBLISHED').length)} icon={Store} />
                </div>

                <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle>Recent Listings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {listings.slice(0, 5).map((listing) => (
                      <div key={listing.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{listing.title}</p>
                          <p className="text-xs text-slate-500">
                            {listing.listing_type} · GHS {Number(listing.price || 0).toFixed(2)}
                          </p>
                        </div>
                        <Badge variant="outline">{listing.status}</Badge>
                      </div>
                    ))}
                    {listings.length === 0 && <p className="text-sm text-slate-500">No listings yet. Create your first listing.</p>}
              </CardContent>
            </Card>
              </>
            )}

            {activeView === 'listings' && (
              <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
                <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle>{editingListingId ? 'Edit Listing' : 'Create Listing'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Type</Label>
                      <Select value={listingForm.listing_type} onValueChange={(v) => setListingForm((s) => ({ ...s, listing_type: v || 'product' }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Title</Label>
                      <Input value={listingForm.title} onChange={(e) => setListingForm((s) => ({ ...s, title: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Description</Label>
                      <Textarea value={listingForm.description} onChange={(e) => setListingForm((s) => ({ ...s, description: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <Input value={listingForm.category} onChange={(e) => setListingForm((s) => ({ ...s, category: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Price (GHS)</Label>
                      <Input type="number" min="0" step="0.01" value={listingForm.price} onChange={(e) => setListingForm((s) => ({ ...s, price: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Location</Label>
                      <Input value={listingForm.location_text} onChange={(e) => setListingForm((s) => ({ ...s, location_text: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Image</Label>
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          void handleUploadListingImage(file);
                        }}
                        disabled={uploadingImage}
                      />
                      <Input
                        placeholder="...or paste image URL"
                        value={listingForm.cover_image_url || ''}
                        onChange={(e) => setListingForm((s) => ({ ...s, cover_image_url: e.target.value }))}
                      />
                      {uploadingImage ? <p className="text-xs text-slate-500">Uploading image...</p> : null}
                      {listingForm.cover_image_url ? (
                        <div
                          className="h-28 w-full rounded-xl border border-slate-200 bg-cover bg-center"
                          style={{ backgroundImage: `url(${listingForm.cover_image_url})` }}
                        />
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select value={listingForm.status} onValueChange={(v) => setListingForm((s) => ({ ...s, status: v || 'PUBLISHED' }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="PUBLISHED">Published</SelectItem>
                          <SelectItem value="PAUSED">Paused</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1" onClick={handleSaveListing} disabled={savingListing}>
                        {savingListing ? 'Saving...' : editingListingId ? 'Update Listing' : 'Create Listing'}
                      </Button>
                      {editingListingId && (
                        <Button variant="outline" onClick={resetListingForm}>
                          Cancel
                        </Button>
                      )}
                  </div>
                </CardContent>
              </Card>

                <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle>My Listings ({listings.length})</CardTitle>
            </CardHeader>
                  <CardContent className="space-y-3">
                    {listings.map((listing) => (
                      <div key={listing.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            {listing.cover_image_url ? (
                              <div
                                className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-cover bg-center"
                                style={{ backgroundImage: `url(${listing.cover_image_url})` }}
                              />
                            ) : null}
                            <div>
                              <p className="font-semibold text-slate-900">{listing.title}</p>
                              <p className="text-xs text-slate-500">
                                {listing.listing_type} · {listing.category || 'General'} · GHS {Number(listing.price || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{listing.status}</Badge>
                </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditListing(listing)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleChangeListingStatus(listing.id, 'PUBLISHED')}>
                            Publish
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleChangeListingStatus(listing.id, 'PAUSED')}>
                            Pause
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleChangeListingStatus(listing.id, 'DRAFT')}>
                            Draft
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleChangeListingStatus(listing.id, 'ARCHIVED')}>
                            Archive
                          </Button>
                        </div>
                      </div>
                    ))}
                    {listings.length === 0 && <p className="text-sm text-slate-500">You have not created any listings yet.</p>}
            </CardContent>
          </Card>
              </div>
            )}

            {activeView === 'orders' && (
              <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Recent Orders ({orders.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div>
                        <p className="text-sm font-semibold text-slate-900">{order.product_name || order.short_id}</p>
                        <p className="text-xs text-slate-500">{order.short_id} · {order.seller_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">GHS {Number(order.product_total || 0).toFixed(2)}</p>
                        <Badge variant="outline">{order.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && <p className="text-sm text-slate-500">No orders yet.</p>}
            </CardContent>
          </Card>
            )}

            {activeView === 'payouts' && (
              <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Payout Monitor</CardTitle>
            </CardHeader>
                <CardContent className="space-y-2">
                  {payouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{payout.type} payout</p>
                        <p className="text-xs text-slate-500">{payout.transaction_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">GHS {Number(payout.amount || 0).toFixed(2)}</p>
                        <Badge variant="outline">{payout.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {payouts.length === 0 && <p className="text-sm text-slate-500">No payouts yet.</p>}
                </CardContent>
              </Card>
            )}

            {activeView === 'reputation' && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle>Trust and Rating</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-slate-600">Track trust signals buyers care about before they buy.</p>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-500">Average Rating</p>
                      <p className="text-xl font-black text-slate-900">
                        {analytics?.avg_rating ? Number(analytics.avg_rating).toFixed(1) : 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-500">Total Reviews</p>
                      <p className="text-xl font-black text-slate-900">{Number(analytics?.total_reviews || 0)}</p>
                  </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle>KYC Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-600">Keep your seller account verified to unlock buyer confidence and payout trust.</p>
                    <Badge variant="outline">{verification?.status || 'NOT_SUBMITTED'}</Badge>
                    <Link href="/seller/verify">
                      <Button className="w-full rounded-xl">Manage KYC</Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeView === 'notifications' && (
              <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Notifications ({notifications.length})</CardTitle>
                  <Button variant="outline" size="sm" onClick={markNotificationsRead}>
                    Mark all as read
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {notifications.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-600">{item.body}</p>
                        </div>
                        <Badge variant="outline">{item.channel || 'LOG'}</Badge>
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && <p className="text-sm text-slate-500">No notifications yet.</p>}
            </CardContent>
          </Card>
        )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function MetricCard({ title, value, icon: Icon }: { title: string; value: string; icon: any }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <span className="rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

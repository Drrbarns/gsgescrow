'use client';

import { useState, useEffect, useMemo, Suspense, useRef, useCallback } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { SOURCE_PLATFORMS, PRODUCT_TYPES, SIMULATION_MODE } from '@/lib/constants';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertTriangle, CheckCircle2, Loader2, Lock, ShoppingBag, Store, CreditCard, Copy, MapPin, LocateFixed, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function BuyerStep1Page() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <BuyerStep1 />
    </Suspense>
  );
}

function BuyerStep1() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();

  const [agreed, setAgreed] = useState(false);
  const [sourcePlatform, setSourcePlatform] = useState('');
  const [listingLink, setListingLink] = useState('');
  const [productType, setProductType] = useState('');
  const [productName, setProductName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [mapQuery, setMapQuery] = useState('');
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [estimatingFee, setEstimatingFee] = useState(false);
  const [estimatedDistanceKm, setEstimatedDistanceKm] = useState<number | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [buyerName, setBuyerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [productTotal, setProductTotal] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [txnShortId, setTxnShortId] = useState('');
  const [activeProvider, setActiveProvider] = useState('Paystack');
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const listingPrefillAppliedRef = useRef(false);
  const paymentCallbackHandledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (profile) setBuyerName(profile.ghana_card_name || profile.full_name || '');
  }, [profile]);

  useEffect(() => {
    const ref = searchParams.get('ref');
    const txn = searchParams.get('txn');
    const provider = searchParams.get('provider');
    const callbackStatus = searchParams.get('status');
    if (provider) {
      setActiveProvider(provider.toLowerCase() === 'moolre' ? 'Moolre' : 'Paystack');
    }
    if (ref && txn) {
      const callbackKey = `${ref}:${txn}:${callbackStatus || ''}`;
      if (paymentCallbackHandledRef.current === callbackKey) return;
      paymentCallbackHandledRef.current = callbackKey;
      verifyPaymentCallback(ref, txn, callbackStatus);
    }
  }, [searchParams]);

  useEffect(() => {
    const listingId = searchParams.get('listing_id');
    if (!listingId || listingPrefillAppliedRef.current) return;
    listingPrefillAppliedRef.current = true;

    const applyFromQuery = () => {
      const listingType = searchParams.get('listing_type');
      const product = searchParams.get('product_name');
      const sellerN = searchParams.get('seller_name');
      const sellerP = searchParams.get('seller_phone');
      const productPrice = searchParams.get('product_total');
      const listingLinkParam = searchParams.get('listing_link');
      const sourcePlatformParam = searchParams.get('source_platform');
      const category = listingType === 'service' ? 'food' : 'non_food';

      if (sourcePlatformParam) setSourcePlatform(sourcePlatformParam);
      if (listingLinkParam) setListingLink(listingLinkParam);
      if (product) setProductName(product);
      if (sellerN) setSellerName(sellerN);
      if (sellerP) setSellerPhone(sellerP);
      if (productPrice) setProductTotal(String(productPrice));
      setProductType(category);
      toast.success('Listing details prefilled. Complete delivery details and proceed.');
    };

    void api
      .getMarketplaceListing(listingId)
      .then((res) => {
        const listing = res.data;
        setSourcePlatform('website');
        setListingLink(`marketplace:${listing.id}`);
        setProductType(listing.listing_type === 'service' ? 'food' : 'non_food');
        setProductName(listing.title || '');
        setSellerName(listing.seller?.full_name || '');
        setSellerPhone(listing.seller?.phone || '');
        setProductTotal(String(listing.price || ''));
        toast.success('Listing details prefilled. Complete delivery details and proceed.');
      })
      .catch(() => {
        applyFromQuery();
      });
  }, [searchParams]);

  async function verifyPaymentCallback(ref: string, txnId: string, callbackStatus?: string | null) {
    const statusFromProvider = (callbackStatus || '').toLowerCase();
    const shouldRetry = statusFromProvider === 'success';
    const maxAttempts = shouldRetry ? 6 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const [verification, txnRes] = await Promise.all([
          api.verifyPayment(ref),
          api.getTransaction(txnId),
        ]);
        const txn = txnRes.data;

        if (txn.status === 'PAID') {
          setTxnShortId(txn.short_id);
          setPaymentSuccess(true);
          toast.success('Payment confirmed!');
          return;
        }

        const providerMarkedSuccess =
          statusFromProvider === 'success' ||
          verification?.data?.success === true ||
          String(verification?.data?.status || '').toLowerCase() === 'success';

        if (providerMarkedSuccess && attempt === maxAttempts - 1) {
          setTxnShortId(txn.short_id || txnId);
          setPaymentSuccess(true);
          toast.success('Payment completed!');
          return;
        }

        if (verification?.data?.pending && attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }

        if (verification?.data?.pending) {
          toast.info('Payment submitted. Awaiting provider confirmation...');
          return;
        }

        toast.info('Payment is being processed. Please refresh in a moment.');
        return;
      } catch {
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        toast.error('Payment verification failed. Please contact support.');
      }
    }
  }

  const buyerFeePercent = 0.35;

  const total = useMemo(() => {
    const pt = parseFloat(productTotal) || 0;
    const df = parseFloat(deliveryFee) || 0;
    const riderReleaseFee = df > 0 ? 1.0 : 0.0;
    const platformFee = parseFloat((pt * buyerFeePercent / 100).toFixed(2));
    return { productTotal: pt, deliveryFee: df, riderReleaseFee, platformFee, grand: pt + df + riderReleaseFee + platformFee };
  }, [productTotal, deliveryFee]);

  const linkWarning = listingLink && !listingLink.match(/^https?:\/\//) && !listingLink.startsWith('marketplace:');
  const externalMapUrl = useMemo(() => {
    if (geoCoords) {
      return `https://www.google.com/maps/search/?api=1&query=${geoCoords.lat},${geoCoords.lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery || deliveryAddress)}`;
  }, [deliveryAddress, geoCoords, mapQuery]);

  async function geocodeAddress(query: string) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return null;
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(trimmedQuery)}`);
    const results = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    if (!Array.isArray(results) || results.length === 0) return null;
    const first = results[0];
    return {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      label: first.display_name || trimmedQuery,
    };
  }

  async function reverseGeocode(lat: number, lng: number) {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    const data = (await response.json()) as { display_name?: string };
    return data?.display_name || `GPS: ${lat}, ${lng}`;
  }

  const ensureMapReady = useCallback(async (coords: { lat: number; lng: number }) => {
    const L = await import('leaflet');
    if (!mapContainerRef.current) return;

    const pinIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([coords.lat, coords.lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);

      markerRef.current = L.marker([coords.lat, coords.lng], { draggable: true, icon: pinIcon }).addTo(mapRef.current);
      markerRef.current.on('dragend', async () => {
        if (!markerRef.current) return;
        const dragged = markerRef.current.getLatLng();
        const lat = parseFloat(dragged.lat.toFixed(6));
        const lng = parseFloat(dragged.lng.toFixed(6));
        setGeoCoords({ lat, lng });
        setMapQuery(`${lat}, ${lng}`);
        setResolvingAddress(true);
        try {
          const label = await reverseGeocode(lat, lng);
          setDeliveryAddress(label);
          toast.success('Delivery pin updated from map drag.');
        } catch {
          setDeliveryAddress(`GPS: ${lat}, ${lng}`);
        } finally {
          setResolvingAddress(false);
        }
      });
    } else {
      mapRef.current.setView([coords.lat, coords.lng], 15);
      if (markerRef.current) markerRef.current.setLatLng([coords.lat, coords.lng]);
    }

    setTimeout(() => mapRef.current?.invalidateSize(), 150);
  }, []);

  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this device/browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        setGeoCoords({ lat, lng });
        setMapQuery(`${lat}, ${lng}`);
        setShowMapPicker(true);
        setLocating(false);

        setResolvingAddress(true);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
          const data = await response.json();
          if (typeof data?.display_name === 'string' && data.display_name.trim()) {
            setDeliveryAddress(data.display_name);
            toast.success('Current location applied to delivery address.');
          } else {
            setDeliveryAddress(`GPS: ${lat}, ${lng}`);
            toast.success('Coordinates captured. Please refine address details.');
          }
        } catch {
          setDeliveryAddress(`GPS: ${lat}, ${lng}`);
          toast.success('Coordinates captured. Please refine address details.');
        } finally {
          setResolvingAddress(false);
        }
      },
      (error) => {
        setLocating(false);
        toast.error(error.message || 'Unable to get your current location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  async function handlePinQueryOnMap() {
    const candidate = mapQuery || deliveryAddress;
    if (!candidate.trim()) {
      toast.error('Enter a location query first.');
      return;
    }
    setResolvingAddress(true);
    try {
      const geocoded = await geocodeAddress(candidate);
      if (!geocoded) {
        toast.error('Could not find that location on map.');
        return;
      }
      setGeoCoords({ lat: geocoded.lat, lng: geocoded.lng });
      setDeliveryAddress(geocoded.label);
      setShowMapPicker(true);
      toast.success('Location pinned on the map.');
    } finally {
      setResolvingAddress(false);
    }
  }

  async function handleEstimateDeliveryFee() {
    if (!pickupLocation.trim()) {
      toast.error('Enter pickup location to estimate delivery fee.');
      return;
    }
    if (!deliveryAddress.trim() && !geoCoords) {
      toast.error('Enter delivery address or pin a location first.');
      return;
    }

    setEstimatingFee(true);
    try {
      const origin = await geocodeAddress(pickupLocation);
      if (!origin) {
        toast.error('Could not geocode pickup location.');
        return;
      }

      const destination = geoCoords || (await geocodeAddress(deliveryAddress));
      if (!destination) {
        toast.error('Could not geocode delivery location.');
        return;
      }

      const routeRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`
      );
      const routeJson = (await routeRes.json()) as { routes?: Array<{ distance: number }> };
      const route = routeJson.routes?.[0];
      if (!route) {
        toast.error('Could not calculate route distance.');
        return;
      }

      const distanceKm = route.distance / 1000;
      setEstimatedDistanceKm(distanceKm);

      const suggestedFee = Math.max(3, parseFloat((2 + distanceKm * 1.4).toFixed(2)));
      setDeliveryFee(suggestedFee.toFixed(2));
      toast.success(`Estimated distance ${distanceKm.toFixed(1)} km. Suggested delivery fee: GHS ${suggestedFee.toFixed(2)}.`);
    } catch {
      toast.error('Failed to estimate delivery fee right now.');
    } finally {
      setEstimatingFee(false);
    }
  }

  useEffect(() => {
    if (!showMapPicker || !geoCoords) return;
    ensureMapReady(geoCoords).catch(() => {
      toast.error('Map failed to load. Please try again.');
    });
  }, [showMapPicker, geoCoords, ensureMapReady]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  async function handleSubmit() {
    if (!agreed) { toast.error('Please accept the terms'); return; }
    if (!sourcePlatform || !productType || !productName || !deliveryAddress || !buyerName || !sellerPhone || !sellerName) {
      toast.error('Please fill all required fields'); return;
    }
    if (total.productTotal <= 0) { toast.error('Product total must be greater than 0'); return; }

    setSubmitting(true);
    try {
      const { data: txn } = await api.createTransaction({
        listing_link: listingLink || undefined,
        source_platform: sourcePlatform,
        product_type: productType,
        product_name: productName,
        delivery_address: deliveryAddress,
        delivery_date: deliveryDate?.toISOString().split('T')[0],
        buyer_name: buyerName,
        seller_phone: sellerPhone,
        seller_name: sellerName,
        product_total: total.productTotal,
        delivery_fee: total.deliveryFee,
      });

      if (SIMULATION_MODE) {
        const { data } = await api.simulatePayment(txn.id);
        setTxnShortId(data.short_id);
        setPaymentSuccess(true);
        toast.success('Simulated payment confirmed!');
      } else {
        const { data: payment } = await api.initiatePayment(txn.id);
        if (payment?.provider) {
          setActiveProvider(payment.provider.toLowerCase() === 'moolre' ? 'Moolre' : 'Paystack');
        }
        window.location.href = payment.authorization_url;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create transaction');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  if (paymentSuccess) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg"
          >
            <div className="rounded-2xl sm:rounded-[2rem] bg-white shadow-2xl shadow-green-500/10 border border-green-100 overflow-hidden text-center">
              <div className="bg-green-500 py-6 px-4 sm:py-10 sm:px-6 text-white">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                  className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg"
                >
                  <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
                </motion.div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Payment Secured!</h2>
                <p className="text-green-100 font-medium text-sm sm:text-base">Your funds are safely locked with licensed and secure PSPs.</p>
              </div>
              
              <div className="p-4 sm:p-8">
                <div className="mb-6 sm:mb-8">
                  <p className="text-sm text-slate-500 uppercase tracking-wider font-bold mb-2">Transaction ID</p>
                  <div className="inline-flex items-center gap-2 sm:gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2">
                    <span className="font-mono text-lg sm:text-xl font-bold text-slate-900">{txnShortId}</span>
                    <button onClick={() => { navigator.clipboard.writeText(txnShortId); toast.success('Copied!'); }} className="text-slate-400 hover:text-primary transition-colors">
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="rounded-xl sm:rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 text-left mb-6 sm:mb-8">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="bg-amber-100 p-2 rounded-full text-amber-600 shrink-0 mt-0.5">
                      <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-amber-900 mb-1 text-sm sm:text-base">Keep Your Code Secret</p>
                      <p className="text-xs sm:text-sm text-amber-800/80 leading-relaxed">
                        A unique delivery code has been generated. <strong className="text-amber-900">Do NOT share it</strong> until you have received and inspected your item. You will need it to release the funds.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={() => router.push('/hub')} className="flex-1 h-12 sm:h-14 rounded-xl text-sm sm:text-base font-bold shadow-lg shadow-primary/25">
                    Go to Dashboard
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/tracking')} className="flex-1 h-12 sm:h-14 rounded-xl text-sm sm:text-base font-bold border-slate-200">
                    Track Order
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Header />

      <main className="flex-1 pb-16 sm:pb-24">
        {/* Light, calm intro — no heavy hero band */}
        <div className="border-b border-slate-200/80 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Secure checkout</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Lock in your payment safely</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              Your money stays protected until you confirm delivery. Most people finish in under two minutes.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 pt-8 sm:pt-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
            {/* Single unified form card — less visual noise than stacked heavy cards */}
            <div className="min-w-0 flex-1">
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                    Order details
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">What you&apos;re buying and where it should go.</p>
                </div>

                <div className="space-y-0 divide-y divide-slate-100">
                  {/* Block A — item */}
                  <div className="px-5 py-6 sm:px-6">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Item</p>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-700">Product name *</Label>
                        <Input
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          placeholder="e.g. iPhone 15 Pro Max 256GB"
                          className="h-11 rounded-lg border-slate-200 bg-white"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-sm text-slate-700">Source *</Label>
                          <Select value={sourcePlatform} onValueChange={(v) => setSourcePlatform(v ?? '')}>
                            <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white">
                              <SelectValue placeholder="Where you found it" />
                            </SelectTrigger>
                            <SelectContent>
                              {SOURCE_PLATFORMS.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-slate-700">Category *</Label>
                          <Select value={productType} onValueChange={(v) => setProductType(v ?? '')}>
                            <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white">
                              <SelectValue placeholder="Type of item" />
                            </SelectTrigger>
                            <SelectContent>
                              {PRODUCT_TYPES.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <details className="group rounded-lg border border-slate-100 bg-slate-50/50">
                        <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:text-slate-900 [&::-webkit-details-marker]:hidden">
                          <span className="inline-flex items-center gap-2">
                            Listing link <span className="text-xs font-normal text-slate-400">(optional)</span>
                          </span>
                        </summary>
                        <div className="border-t border-slate-100 px-3 pb-3 pt-1">
                          <Input
                            value={listingLink}
                            onChange={(e) => setListingLink(e.target.value)}
                            placeholder="https://…"
                            className="h-10 rounded-lg border-slate-200 bg-white text-sm"
                          />
                          {linkWarning && (
                            <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-700">
                              <AlertTriangle className="h-3 w-3 shrink-0" /> Use a full link starting with http:// or https://
                            </p>
                          )}
                        </div>
                      </details>
                    </div>
                  </div>

                  {/* Block B — delivery */}
                  <div className="px-5 py-6 sm:px-6">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Delivery</p>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-700">Delivery address *</Label>
                        <Textarea
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="House number, street, landmark, city"
                          className="min-h-[88px] resize-none rounded-lg border-slate-200 bg-white text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-700">Preferred delivery date</Label>
                        <Popover>
                          <PopoverTrigger className="flex h-11 w-full items-center justify-start rounded-lg border border-slate-200 bg-white px-3 text-left text-sm font-normal text-slate-700 hover:bg-slate-50">
                            <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                            {deliveryDate ? format(deliveryDate, 'PPP') : <span className="text-slate-400">Pick a date (optional)</span>}
                          </PopoverTrigger>
                          <PopoverContent className="w-auto rounded-lg p-0">
                            <Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <details className="group rounded-lg border border-dashed border-slate-200 bg-white">
                        <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-primary [&::-webkit-details-marker]:hidden">
                          Map, GPS & distance estimate
                        </summary>
                        <div className="space-y-4 border-t border-slate-100 px-3 pb-4 pt-3">
                          <p className="text-xs text-slate-500">
                            Optional — use this if you want a map pin or an automatic delivery fee suggestion from distance.
                          </p>
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-600">Seller pickup point (for distance)</Label>
                            <Input
                              value={pickupLocation}
                              onChange={(e) => setPickupLocation(e.target.value)}
                              placeholder="e.g. Madina, Accra"
                              className="h-10 rounded-lg border-slate-200 bg-slate-50 text-sm"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" className="h-8 rounded-md text-xs" onClick={() => setShowMapPicker((prev) => !prev)}>
                              <MapPin className="mr-1 h-3.5 w-3.5" />
                              {showMapPicker ? 'Hide map' : 'Map picker'}
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="h-8 rounded-md text-xs" onClick={handleUseCurrentLocation} disabled={locating || resolvingAddress}>
                              {locating || resolvingAddress ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                              <span className="ml-1">Use my location</span>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-md text-xs"
                              onClick={() => window.open(externalMapUrl, '_blank')}
                              disabled={!mapQuery && !deliveryAddress && !geoCoords}
                            >
                              <ExternalLink className="mr-1 h-3.5 w-3.5" />
                              Google Maps
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-md text-xs"
                              onClick={handlePinQueryOnMap}
                              disabled={resolvingAddress || (!mapQuery.trim() && !deliveryAddress.trim())}
                            >
                              {resolvingAddress ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                              <span className="ml-1">Pin on map</span>
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-8 w-full rounded-md text-xs sm:w-auto"
                            onClick={handleEstimateDeliveryFee}
                            disabled={estimatingFee}
                          >
                            {estimatingFee ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                            Suggest fee from distance
                          </Button>
                          {estimatedDistanceKm !== null && (
                            <p className="text-xs text-slate-600">Last route distance: ~{estimatedDistanceKm.toFixed(1)} km</p>
                          )}
                          {showMapPicker && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                              <Label className="text-xs font-medium text-slate-700">Search or coordinates</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={mapQuery}
                                  onChange={(e) => setMapQuery(e.target.value)}
                                  placeholder="Area name or GPS"
                                  className="h-10 flex-1 rounded-lg bg-white text-sm"
                                />
                                <Button type="button" size="sm" className="h-10 shrink-0 rounded-lg" onClick={() => setDeliveryAddress(mapQuery.trim())} disabled={!mapQuery.trim()}>
                                  Apply
                                </Button>
                              </div>
                              {geoCoords ? (
                                <div className="space-y-2">
                                  <p className="text-[11px] text-slate-500">
                                    Pin: {geoCoords.lat.toFixed(5)}, {geoCoords.lng.toFixed(5)}
                                  </p>
                                  <div ref={mapContainerRef} className="h-56 w-full overflow-hidden rounded-lg border border-slate-200" />
                                  <p className="text-[11px] text-slate-500">Drag the marker to adjust.</p>
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-500">Use &ldquo;Use my location&rdquo; or &ldquo;Pin on map&rdquo; to show the map.</p>
                              )}
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  </div>

                  {/* Block C — people */}
                  <div className="px-5 py-6 sm:px-6">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">You & seller</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="text-sm text-slate-700">Your name (as on Ghana Card) *</Label>
                        <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="h-11 rounded-lg border-slate-200 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-700">Seller / business *</Label>
                        <Input value={sellerName} onChange={(e) => setSellerName(e.target.value)} placeholder="e.g. Kojo Phones" className="h-11 rounded-lg border-slate-200 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-700">Seller phone *</Label>
                        <Input value={sellerPhone} onChange={(e) => setSellerPhone(e.target.value)} placeholder="+233…" className="h-11 rounded-lg border-slate-200 bg-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky pay column — big total first, details collapsed */}
            <aside className="w-full shrink-0 lg:w-[min(100%,380px)] lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Amount & pay
                  </h2>
                </div>
                <div className="space-y-5 px-5 py-6 sm:px-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-700">Item price (GHS) *</Label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">GHS</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={productTotal}
                          onChange={(e) => setProductTotal(e.target.value)}
                          placeholder="0.00"
                          className="h-11 rounded-lg border-slate-200 bg-white pl-12 text-base font-semibold"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-700">Delivery (GHS) *</Label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">GHS</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={deliveryFee}
                          onChange={(e) => setDeliveryFee(e.target.value)}
                          placeholder="0.00"
                          className="h-11 rounded-lg border-slate-200 bg-white pl-12 text-base font-semibold"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">Use 0 if there&apos;s no delivery fee.</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gradient-to-br from-primary/[0.06] to-sky-500/[0.04] px-4 py-5 ring-1 ring-primary/10">
                    <p className="text-xs font-medium text-slate-600">You&apos;ll pay</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">GHS {total.grand.toFixed(2)}</p>
                    <p className="mt-2 text-xs text-slate-500">Includes small platform fees — see breakdown if you need the detail.</p>
                  </div>

                  <details className="rounded-lg border border-slate-100 bg-slate-50/80">
                    <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-slate-700 [&::-webkit-details-marker]:hidden">
                      View fee breakdown
                    </summary>
                    <div className="space-y-2 border-t border-slate-100 px-3 py-3 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Item</span>
                        <span className="font-medium text-slate-900">GHS {total.productTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Delivery</span>
                        <span className="font-medium text-slate-900">GHS {total.deliveryFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Rider / PSP fee</span>
                        <span className="font-medium text-slate-900">GHS {total.riderReleaseFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Platform ({buyerFeePercent}%)</span>
                        <span className="font-medium text-slate-900">GHS {total.platformFee.toFixed(2)}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold text-slate-900">
                        <span>Total</span>
                        <span>GHS {total.grand.toFixed(2)}</span>
                      </div>
                      <p className="pt-1 text-[11px] text-slate-400">Additional PSP or telco charges may apply at payment.</p>
                    </div>
                  </details>

                  <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                    <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
                    <Label htmlFor="agree" className="cursor-pointer text-xs leading-relaxed text-slate-700">
                      I agree to the{' '}
                      <a href="/terms" className="font-medium text-primary underline underline-offset-2" target="_blank" rel="noreferrer">
                        terms
                      </a>
                      . Funds stay protected until I confirm delivery.
                    </Label>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !agreed || total.grand <= 0}
                    className="h-12 w-full rounded-xl text-base font-semibold shadow-md shadow-primary/15"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Working…
                      </>
                    ) : (
                      `Continue to pay · GHS ${total.grand.toFixed(2)}`
                    )}
                  </Button>
                  <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
                    <Lock className="h-3 w-3" />
                    Encrypted checkout · {activeProvider}
                  </p>
                </div>
              </div>

              <p className="mt-4 hidden text-center text-xs text-slate-400 lg:block">
                <Store className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
                Questions? Check the fee calculator or contact support from your hub.
              </p>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

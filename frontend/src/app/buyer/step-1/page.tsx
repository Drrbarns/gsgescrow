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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (profile) setBuyerName(profile.ghana_card_name || profile.full_name || '');
  }, [profile]);

  useEffect(() => {
    const ref = searchParams.get('ref');
    const txn = searchParams.get('txn');
    if (ref && txn) {
      verifyPaymentCallback(ref, txn);
    }
  }, [searchParams]);

  async function verifyPaymentCallback(ref: string, txnId: string) {
    try {
      await api.verifyPayment(ref);
      const { data: txn } = await api.getTransaction(txnId);
      setTxnShortId(txn.short_id);
      setPaymentSuccess(true);
      toast.success('Payment confirmed!');
    } catch {
      toast.error('Payment verification failed. Please contact support.');
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

  const linkWarning = listingLink && !listingLink.match(/^https?:\/\//);
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
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      
      <main className="flex-1 pb-12 sm:pb-24">
        {/* Header Section */}
        <div className="bg-slate-950 pt-8 pb-24 sm:pt-12 sm:pb-32 text-white px-4">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-primary text-white font-bold text-lg sm:text-xl shadow-lg shadow-primary/30 shrink-0">
                1
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">Secure Your Purchase</h1>
                <p className="text-slate-400 mt-1 text-sm sm:text-base">Fill in the details to lock your funds in the PSPs vault.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="mx-auto max-w-4xl px-4 -mt-16 sm:-mt-20 relative z-10">
          <div className="rounded-xl sm:rounded-3xl bg-white shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col lg:flex-row">
            
            {/* Left Side: Form */}
            <div className="flex-[3] p-4 sm:p-6 lg:p-10 lg:border-r border-slate-100">
              
              <div className="space-y-6 sm:space-y-8">
                {/* Section 1: Item Details */}
                <div>
                  <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900 mb-4 sm:mb-5 pb-2 border-b border-slate-100">
                    <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Item Details
                  </h3>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-semibold">Where did you find this? *</Label>
                      <Select value={sourcePlatform} onValueChange={v => setSourcePlatform(v ?? '')}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200"><SelectValue placeholder="Select platform" /></SelectTrigger>
                        <SelectContent>
                          {SOURCE_PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-semibold">Product/Service Category *</Label>
                      <Select value={productType} onValueChange={v => setProductType(v ?? '')}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {PRODUCT_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-slate-600 font-semibold">Exact Product Name *</Label>
                      <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. iPhone 15 Pro Max 256GB" className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-slate-600 font-semibold">Listing URL (Optional)</Label>
                      <Input value={listingLink} onChange={e => setListingLink(e.target.value)} placeholder="https://instagram.com/p/..." className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                      {linkWarning && <p className="text-xs text-amber-600 flex items-center gap-1 mt-1"><AlertTriangle className="h-3 w-3" /> Please enter a valid URL</p>}
                    </div>
                  </div>
                </div>

                {/* Section 2: Delivery */}
                <div>
                  <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900 mb-4 sm:mb-5 pb-2 border-b border-slate-100">
                    <Store className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Delivery & Parties
                  </h3>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-slate-600 font-semibold">Full Delivery Address *</Label>
                      <Textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="House number, Street, Landmark, City" className="min-h-[100px] rounded-xl bg-slate-50 border-slate-200 resize-none" />
                      <div className="space-y-2">
                        <Label className="text-slate-600 font-semibold">Pickup Location (for distance estimate)</Label>
                        <Input
                          value={pickupLocation}
                          onChange={(e) => setPickupLocation(e.target.value)}
                          placeholder="e.g. Madina, Accra"
                          className="h-11 rounded-xl bg-white border-slate-200"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setShowMapPicker((prev) => !prev)}>
                          <MapPin className="h-4 w-4" /> {showMapPicker ? 'Hide Map Picker' : 'Open Map Picker'}
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleUseCurrentLocation} disabled={locating || resolvingAddress}>
                          {(locating || resolvingAddress) ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                          Use Current Location
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => window.open(externalMapUrl, '_blank')} disabled={!mapQuery && !deliveryAddress && !geoCoords}>
                          <ExternalLink className="h-4 w-4" /> Open in Maps
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handlePinQueryOnMap} disabled={resolvingAddress || (!mapQuery.trim() && !deliveryAddress.trim())}>
                          {resolvingAddress ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                          Pin Query on Map
                        </Button>
                      </div>
                      {showMapPicker && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                          <Label className="text-xs font-semibold text-slate-600">Search/Map Query</Label>
                          <Input
                            value={mapQuery}
                            onChange={(e) => setMapQuery(e.target.value)}
                            placeholder="e.g. East Legon, Accra or GPS coordinates"
                            className="h-10 bg-white"
                          />
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setDeliveryAddress(mapQuery.trim())}
                              disabled={!mapQuery.trim()}
                            >
                              Apply Query to Address
                            </Button>
                          </div>
                          {geoCoords ? (
                            <div className="space-y-2">
                              <p className="text-xs text-slate-500">Pinned coordinates: {geoCoords.lat}, {geoCoords.lng}</p>
                              <div ref={mapContainerRef} className="w-full h-56 rounded-lg border border-slate-200" />
                              <p className="text-[11px] text-slate-500">Drag the pin to fine-tune exact delivery point.</p>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">Use &ldquo;Current Location&rdquo; to pin coordinates and render an in-page map preview.</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-semibold">Expected Delivery Date</Label>
                      <Popover>
                        <PopoverTrigger className="flex w-full h-12 items-center justify-start rounded-xl border border-slate-200 bg-slate-50 px-3 text-left font-normal text-slate-600 hover:bg-slate-100">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {deliveryDate ? format(deliveryDate, 'PPP') : 'Select date'}
                          </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-xl"><Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} /></PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-semibold">Your Name (Ghana Card) *</Label>
                      <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-semibold">Seller&apos;s Phone Number *</Label>
                      <Input value={sellerPhone} onChange={e => setSellerPhone(e.target.value)} placeholder="+233..." className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-semibold">Seller&apos;s Name / Business *</Label>
                      <Input value={sellerName} onChange={e => setSellerName(e.target.value)} placeholder="e.g. Kojo Phones" className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Side: Pricing & Checkout */}
            <div className="flex-[2] bg-slate-50 p-4 sm:p-6 lg:p-10 flex flex-col">
              <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900 mb-4 sm:mb-6">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Payment Summary
              </h3>
              
              <div className="space-y-6 flex-1">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold">Agreed Product Price (GHS) *</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-slate-400 text-sm sm:text-base">GHS</span>
                      <Input type="number" min="0" step="0.01" value={productTotal} onChange={e => setProductTotal(e.target.value)} placeholder="0.00" className="h-12 sm:h-14 pl-14 text-lg sm:text-xl font-bold rounded-xl border-slate-200 focus-visible:ring-primary/20" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold">Delivery Fee (GHS) *</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-slate-400 text-sm sm:text-base">GHS</span>
                      <Input type="number" min="0" step="0.01" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} placeholder="0.00" className="h-12 sm:h-14 pl-14 text-lg sm:text-xl font-bold rounded-xl border-slate-200 focus-visible:ring-primary/20" />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleEstimateDeliveryFee} disabled={estimatingFee} className="gap-2">
                      {estimatingFee ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                      Estimate by Distance
                    </Button>
                    {estimatedDistanceKm !== null && (
                      <p className="text-xs text-slate-600">Last estimated route distance: {estimatedDistanceKm.toFixed(1)} km.</p>
                    )}
                    <p className="text-xs text-slate-500">Set to GHS 0.00 if no delivery fee applies.</p>
                  </div>
                </div>

                <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex justify-between text-xs sm:text-sm text-slate-600"><span>Item Total</span><span className="font-medium text-slate-900">GHS {total.productTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs sm:text-sm text-slate-600"><span>Delivery</span><span className="font-medium text-slate-900">GHS {total.deliveryFee.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs sm:text-sm text-slate-600"><span>Rider Release (PSP Fee)</span><span className="font-medium text-slate-900">GHS {total.riderReleaseFee.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs sm:text-sm text-slate-600"><span>Platform Fee (0.35%)</span><span className="font-medium text-slate-900">GHS {total.platformFee.toFixed(2)}</span></div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-end">
                    <span className="font-bold text-slate-900 text-sm sm:text-base">Total to Pay</span>
                    <span className="text-xl sm:text-2xl font-extrabold text-primary">GHS {total.grand.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Note: PSPs/Telco fees may apply.</p>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 sm:p-4">
                  <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                  <Label htmlFor="agree" className="text-xs sm:text-sm leading-relaxed cursor-pointer text-blue-900 font-medium">
                    I agree to the <a href="/terms" className="underline hover:text-blue-700" target="_blank">Terms of Service</a>. I understand my funds will be locked with PSPs until I confirm delivery.
                  </Label>
                </div>
              </div>

              <div className="mt-6 sm:mt-8">
                <Button 
                  onClick={handleSubmit} 
                  disabled={submitting || !agreed || total.grand <= 0} 
                  className="w-full h-12 sm:h-14 rounded-xl text-base sm:text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all"
                >
                  {submitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Securing Funds...</> : `Pay GHS ${total.grand.toFixed(2)}`}
                </Button>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
                  <Lock className="h-3 w-3" /> Secured by Paystack
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

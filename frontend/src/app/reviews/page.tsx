'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { Star, MessageSquareQuote, PackageSearch, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface Review {
  id: string;
  rating: number;
  comment: string;
  product_name: string;
  seller_name: string;
  buyer_name: string;
  created_at: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-slate-100 text-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listReviews({ status: 'approved' })
      .then((res) => setReviews(res.data || []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main className="flex-1">
        {/* Premium Hero Section */}
        <section className="relative overflow-hidden bg-slate-950 pt-16 pb-32 sm:pt-24 sm:pb-48 text-white">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <Image 
              src="/images/happy-customer.png" 
              alt="Happy Customer" 
              fill 
              className="object-cover opacity-30 mix-blend-overlay"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent"></div>
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-amber-500/20 blur-[120px]" />
          </div>

          <div className="relative mx-auto max-w-4xl px-4 text-center z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-amber-200 backdrop-blur-md border border-white/10 mb-6"
            >
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span>100% Verified Transactions</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl mb-4 sm:mb-6"
            >
              Real <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-primary">Reviews</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mx-auto max-w-2xl text-base sm:text-lg text-slate-300"
            >
              Every review here is tied to a real, completed escrow transaction. No fake reviews, just genuine experiences from buyers and sellers across Ghana.
            </motion.p>
          </div>
        </section>

        {/* Floating Reviews Grid */}
        <section className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 -mt-20 sm:-mt-32 pb-12 sm:pb-24">
          {loading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="rounded-xl sm:rounded-2xl lg:rounded-3xl bg-white p-5 sm:p-8 shadow-xl border border-slate-100">
                  <Skeleton className="h-4 w-24 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-6" />
                  <div className="pt-4 border-t border-slate-100 flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && reviews.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl sm:rounded-2xl lg:rounded-3xl bg-white shadow-xl border border-slate-100 p-8 sm:p-16 text-center max-w-3xl mx-auto"
            >
              <div className="mx-auto w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <PackageSearch className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">No reviews yet</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Reviews will appear here once buyers complete transactions and share their experience.
              </p>
            </motion.div>
          )}

          {!loading && reviews.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group rounded-xl sm:rounded-2xl lg:rounded-3xl bg-white shadow-xl shadow-slate-200/40 border border-slate-100 p-5 sm:p-6 lg:p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4 sm:mb-6">
                    <StarRating rating={review.rating} />
                    <div className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      <ShieldCheck className="h-3 w-3" />
                      Verified
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 mb-2 sm:mb-3 text-base sm:text-lg leading-tight">
                    {review.product_name}
                  </h3>

                  <p className="text-slate-600 leading-relaxed flex-1 italic">
                    "{review.comment}"
                  </p>

                  <div className="mt-6 sm:mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                        {review.seller_name?.charAt(0).toUpperCase() || 'S'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Seller</span>
                        <span className="font-semibold text-slate-900">{review.seller_name || '—'}</span>
                      </div>
                    </div>
                    <span className="text-slate-400 font-medium text-xs">
                      {review.created_at
                        ? new Date(review.created_at).toLocaleDateString('en-GH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : ''}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

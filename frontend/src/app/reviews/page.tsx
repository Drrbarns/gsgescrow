'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Star, PackageSearch, ShieldCheck, Quote, Sparkles, MessageSquareHeart } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <div className="flex min-h-screen flex-col bg-slate-100">
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-white border-b border-slate-200">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(109,40,217,0.08),transparent_35%),radial-gradient(circle_at_100%_0%,rgba(59,130,246,0.08),transparent_40%)]" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14 relative z-10">
            <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary mb-4">
                  <Sparkles className="h-4 w-4" />
                  Verified Community Feedback
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
                  Reviews That Build Trust
                </h1>
                <p className="max-w-2xl text-sm sm:text-base text-slate-600 leading-relaxed">
                  Every review is attached to a completed secure transaction. No fake testimonials, no paid hype, just real buyer and seller experiences.
                </p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified Orders Only
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    <MessageSquareHeart className="h-3.5 w-3.5" /> Community Driven
                  </div>
                </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12 pb-12 sm:pb-24">
          {loading && (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="rounded-3xl bg-white p-5 sm:p-7 shadow-sm border border-slate-200">
                  <Skeleton className="h-4 w-24 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-4/5 mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-6" />
                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
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
              className="rounded-3xl bg-white shadow-sm border border-slate-200 p-8 sm:p-14 text-center max-w-3xl mx-auto"
            >
              <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <PackageSearch className="h-10 w-10 text-primary/50" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">No reviews yet</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Reviews will appear here once buyers complete transactions and share their experience.
              </p>
              <Link href="/buyer/step-1" className="inline-block mt-6">
                <Button className="rounded-full px-6">Start a Transaction</Button>
              </Link>
            </motion.div>
          )}

          {!loading && reviews.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="group rounded-3xl bg-white shadow-sm border border-slate-200 p-5 sm:p-6 hover:shadow-xl hover:shadow-slate-200/70 hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <StarRating rating={review.rating} />
                      <p className="mt-2 text-xs text-slate-500">{review.product_name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                      <ShieldCheck className="h-3 w-3" />
                      Verified
                    </div>
                  </div>

                  <div className="mb-3 text-primary/70">
                    <Quote className="h-5 w-5" />
                  </div>
                  <p className="text-slate-700 leading-relaxed flex-1 italic text-sm sm:text-base">
                    &ldquo;{review.comment}&rdquo;
                  </p>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
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

"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Coins, ShoppingBag } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import UpiAppChooser from "@/components/UpiAppChooser";
import { useAuth } from "@/lib/auth";
import { dbClient } from "@/lib/db-client";
import { wallet } from "@/lib/wallet";

interface Painting {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
}

const MIN_AMOUNT = 10;
const MAX_AMOUNT = 100000;

const PAINTING_NAMES = [
  "Abstract Harmony", "Ocean Dreams", "Urban Life", "Nature's Palette",
  "Modern Minimalism", "Classic Portrait", "Sunset Serenity", "Geometric Patterns",
  "Mountain Majesty", "Vintage Collection", "Contemporary Art", "Masterpiece Collection",
  "Rural Bliss", "City Lights", "Floral Symphony", "Golden Hour",
  "Silent Waters", "Desert Dunes", "Forest Path", "Skyline View",
  "Heritage Art", "Minimalist Flow", "Bold Strokes", "Soft Pastels",
  "Monsoon Mood", "Winter Dawn", "Summer Bloom", "Autumn Leaves",
  "Sacred Art", "Folk Tales",
];

const PAINTING_IMAGES = [
  "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1024&h=1024&fit=crop",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1024&h=1024&fit=crop",
  "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1024&h=1024&fit=crop",
  "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1024&h=1024&fit=crop",
  "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=1024&h=1024&fit=crop",
  "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1024&h=1024&fit=crop",
];

/** Build painting options for a given amount – all priced at that amount. */
function buildPaintingsForAmount(amount: number): Painting[] {
  return PAINTING_NAMES.map((name, index) => ({
    id: `painting-${amount}-${index}`,
    name,
    price: amount,
    image: PAINTING_IMAGES[index % PAINTING_IMAGES.length],
    description: "Artwork",
    category: amount >= 50000 ? "Premium" : amount >= 10000 ? "Collector" : "Standard",
  }));
}

function formatINR(amount: number): string {
  return `₹${amount >= 1000 ? amount.toLocaleString("en-IN") : amount.toFixed(2)}`;
}

function MerchandiseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [activeUpiLink, setActiveUpiLink] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const amount = searchParams.get("amount");
    if (amount) {
      setDepositAmount(parseFloat(amount));
    }
  }, [searchParams]);

  // All paintings shown are priced exactly at the amount entered (Rs. 10 – Rs. 1,00,000)
  const availablePaintings = useMemo(() => {
    if (!depositAmount || depositAmount < MIN_AMOUNT || depositAmount > MAX_AMOUNT) {
      return [];
    }
    return buildPaintingsForAmount(Math.round(depositAmount));
  }, [depositAmount]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Merchandise
          </h1>
        </div>

        {/* Message: free coins for Indimarket on any painting buy */}
        {depositAmount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-4 border border-amber-200 dark:border-amber-800">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100 text-center">
              On buying any painting we offer free coins for Indimarket to wager.
            </p>
          </div>
        )}

        {/* Purchase amount – free wagering points added when buy completes */}
        {depositAmount > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6 mb-8 border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Purchase amount (INR) – free wagering points added on buy
                </div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {formatINR(depositAmount)}
                </div>
              </div>
              <ShoppingBag className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        )}

        {purchaseError && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {purchaseError}
          </div>
        )}

        {/* Paintings Grid */}
        {availablePaintings.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Available Paintings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {availablePaintings.map((painting) => (
                <div
                  key={painting.id}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200 cursor-pointer group"
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-200 dark:bg-slate-700">
                    <img
                      src={painting.image}
                      alt={painting.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                      {painting.name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {painting.description}
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                          {formatINR(depositAmount)}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Free points of same amount
                        </p>
                      </div>
                      <button
                        disabled={!!purchasingId}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm"
                        onClick={async () => {
                          setPurchaseError(null);
                          setPurchasingId(painting.id);
                          try {
                            const { paymentLink, upiLink, redirectUrl } = await dbClient.initiatePayment({
                              paintingId: painting.id,
                              paintingName: painting.name,
                              paintingImageUrl: painting.image,
                              amountInr: painting.price,
                            });
                            setPurchasingId(null);
                            const isMobile = typeof window !== "undefined" && (window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

                            if (isMobile && upiLink) {
                              setActiveUpiLink(upiLink);
                            } else {
                              const url = paymentLink || redirectUrl || upiLink;
                              if (url) window.location.href = url;
                            }
                          } catch (e: any) {
                            setPurchasingId(null);
                            setPurchaseError(e?.message || "Payment could not be started. Please try again.");
                          }
                        }}
                      >
                        {purchasingId === painting.id ? "Redirecting to payment…" : "Buy Now"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : depositAmount > 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              Amount must be between Rs. 10 and Rs. 1,00,000. Enter an amount in the wallet to see paintings at that price.
            </p>
          </div>
        ) : null}

        {/* Free Coins Section */}
        {depositAmount > 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-full p-3">
                <Coins className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Free Coins for Indimarket
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  On buying any painting we offer free coins for Indimarket to wager
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  Points value (same as painting amount):
                </span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatINR(depositAmount)}
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  Complete a purchase above to receive free wagering coins for Indimarket in your wallet.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeUpiLink && (
        <UpiAppChooser
          upiLink={activeUpiLink}
          onClose={() => setActiveUpiLink(null)}
        />
      )}
      <BottomNav />
    </div>
  );
}

export default function MerchandisePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600" />
        </div>
      }
    >
      <MerchandiseContent />
    </Suspense>
  );
}

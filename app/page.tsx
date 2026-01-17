"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Market, WagerRequest, MarketCategory, MarketTerm } from "@/types";
import MarketCard from "@/components/MarketCard";
import WagerModal from "@/components/WagerModal";
import FilterBar from "@/components/FilterBar";
import MarketsByCategory from "@/components/MarketsByCategory";
import IndimarketLogo from "@/components/IndimarketLogo";
import SearchBar from "@/components/SearchBar";
import ActivityTicker from "@/components/ActivityTicker";
import CategoryNav from "@/components/CategoryNav";
import BottomNav from "@/components/BottomNav";
import MarketStats from "@/components/MarketStats";
import LiveTradeAlert from "@/components/LiveTradeAlert";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Filter, User } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showWagerModal, setShowWagerModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<MarketTerm | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [preSelectedSelection, setPreSelectedSelection] = useState<"yes" | "no" | undefined>(undefined);

  // Redirect to login if not authenticated
  useEffect(() => {
    // Only redirect if we've finished loading and there's no user
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);


  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getMarkets(selectedCategory || undefined, selectedTerm || undefined);
      setMarkets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch markets");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedTerm]);

  // API key is now managed server-side, so we always try to fetch markets
  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);


  // Filter markets based on search query
  const filteredMarkets = useMemo(() => {
    if (!searchQuery.trim()) {
      return markets;
    }
    const query = searchQuery.toLowerCase();
    return markets.filter((market) =>
      market.title.toLowerCase().includes(query)
    );
  }, [markets, searchQuery]);

  const handlePlaceWager = (market: Market, selection: "yes" | "no") => {
    setSelectedMarket(market);
    setPreSelectedSelection(selection);
    setShowWagerModal(true);
  };

  const handleWagerSuccess = () => {
    setShowWagerModal(false);
    setSelectedMarket(null);
    // Optionally refresh markets to show updated pools
    fetchMarkets();
  };


  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600"></div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-lg border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between animate-slideInRight">
            <div className="flex items-center space-x-2 sm:space-x-4 group">
              <IndimarketLogo className="transition-transform duration-300 group-hover:scale-105" />
              <h1 className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-500 hidden sm:block">
                Prediction Network
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href="/more"
                className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-3 sm:py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md touch-manipulation"
              >
                <User className="h-4 w-4 sm:h-4 sm:w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <ActivityTicker />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 pb-20 sm:pb-8">
        <MarketStats />

        <CategoryNav
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
        <div className="mb-4 animate-fadeInUp">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center w-12 h-12 sm:w-auto sm:h-auto sm:px-4 sm:py-3 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md touch-manipulation ${showFilters
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "text-slate-300 dark:text-slate-300 bg-slate-700 dark:bg-slate-800 hover:bg-slate-600 dark:hover:bg-slate-700 border border-slate-600 dark:border-slate-700"
                }`}
            >
              <Filter className="h-5 w-5 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline ml-2">Filter</span>
            </button>
          </div>
          {showFilters && (
            <div className="mt-4 animate-fadeInUp">
              <FilterBar
                selectedCategory={selectedCategory}
                selectedTerm={selectedTerm}
                onCategoryChange={setSelectedCategory}
                onTermChange={setSelectedTerm}
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 dark:border-indigo-900"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600 absolute top-0 left-0"></div>
            </div>
            <p className="mt-4 text-slate-600 dark:text-slate-400 animate-pulse-slow">Loading markets...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Error
            </h3>
            <p className="text-red-600 dark:text-red-300">{error}</p>
            <button
              onClick={fetchMarkets}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              {searchQuery
                ? `No markets found matching "${searchQuery}"`
                : `No markets available ${selectedCategory || selectedTerm ? "for the selected filters" : "at the moment"}.`
              }
            </p>
          </div>
        ) : (
          <MarketsByCategory markets={filteredMarkets} onPlaceWager={handlePlaceWager} />
        )}
      </main>

      {showWagerModal && selectedMarket && (
        <WagerModal
          market={selectedMarket}
          preSelected={preSelectedSelection}
          onClose={() => {
            setShowWagerModal(false);
            setSelectedMarket(null);
            setPreSelectedSelection(undefined);
          }}
          onSuccess={handleWagerSuccess}
        />
      )}



      <LiveTradeAlert />
      <BottomNav />
    </div>
  );
}



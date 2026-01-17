"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, TrendingUp } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { api } from "@/lib/api";
import { Market, MarketCategory } from "@/types";

import ActivityTicker from "@/components/ActivityTicker";

export default function BreakingPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  const categories: (MarketCategory | "All")[] = ["All", "Politics", "World", "Sports", "Crypto", "Finance", "NFL", "NBA", "Cricket", "Football", "Election"];

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        const category = selectedCategory === null ? undefined : selectedCategory;
        const data = await api.getMarkets(category);
        setMarkets(data);
      } catch (error) {
        console.error("Error fetching markets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, [selectedCategory]);

  const formatDate = () => {
    const date = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const calculatePercentage = (market: Market): number => {
    const poolYes = parseFloat(market.pool_yes);
    const poolNo = parseFloat(market.pool_no);
    const totalPool = poolYes + poolNo;
    if (totalPool === 0) return 50;
    return Math.round((poolYes / totalPool) * 100);
  };

  const calculateChange = (market: Market): number => {
    // Mock change calculation - in real app, this would compare with previous values
    return Math.floor(Math.random() * 50);
  };

  const handleNewsClick = (market: Market) => {
    router.push(`/?market=${market.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <ActivityTicker />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Breaking News Header Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 dark:from-indigo-700 dark:to-indigo-900 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg border border-indigo-500/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-slate-300 dark:text-slate-400 text-xs sm:text-sm mb-2">
                {formatDate()}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Breaking News
              </h1>
            </div>
            <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-indigo-500/30 rounded-full flex-shrink-0 ml-4">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-indigo-400 rounded-full p-2">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 sm:gap-3 pb-1">
            {categories.map((category) => {
              const isSelected = category === "All"
                ? selectedCategory === null
                : selectedCategory === category;

              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category === "All" ? null : category as MarketCategory)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 touch-manipulation ${isSelected
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* News Items List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 dark:border-indigo-900"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600 absolute top-0 left-0"></div>
            </div>
            <p className="mt-4 text-slate-600 dark:text-slate-400 animate-pulse-slow">Loading markets...</p>
          </div>
        ) : markets.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              No breaking news available at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {markets.slice(0, 20).map((market, index) => {
              const percentage = calculatePercentage(market);
              const change = calculateChange(market);

              return (
                <button
                  key={market.id}
                  onClick={() => handleNewsClick(market)}
                  className="w-full bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 flex items-center gap-3 sm:gap-4 text-left touch-manipulation group"
                >
                  {/* Number */}
                  <div className="flex-shrink-0 w-6 sm:w-8 text-slate-400 dark:text-slate-500 font-semibold text-base sm:text-lg">
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white mb-1 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {market.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
                      <span>↓</span>
                      <span>{change}%</span>
                    </div>
                  </div>

                  {/* Percentage and Arrow */}
                  <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3">
                    <div className="text-right">
                      <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {percentage}%
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}


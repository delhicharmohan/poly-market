"use client";

import { useState, useEffect } from "react";
import { Market } from "@/types";
import { Clock } from "lucide-react";

import { getMarketImage } from "@/lib/images";

interface MarketCardProps {
  market: Market;
  onPlaceWager: (selection: "yes" | "no") => void;
}

function formatCountdown(timeRemaining: number): string {
  if (timeRemaining <= 0) {
    return "Closed";
  }

  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

export default function MarketCard({ market, onPlaceWager }: MarketCardProps) {
  const isOpen = market.status?.toUpperCase() === "OPEN";
  // Handle both string and number timestamps
  const closureTimestamp = typeof market.closure_timestamp === "string"
    ? parseInt(market.closure_timestamp)
    : market.closure_timestamp || 0;

  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = closureTimestamp - now;
      setTimeRemaining(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [closureTimestamp]);

  const poolYes = parseFloat(market.pool_yes) || 0;
  const poolNo = parseFloat(market.pool_no) || 0;
  const totalPool = parseFloat(market.total_pool) || (poolYes + poolNo);

  const oddsYes = market.odds?.yes || (totalPool > 0 ? (totalPool / (poolYes || 1)) : 2);
  const oddsNo = market.odds?.no || (totalPool > 0 ? (totalPool / (poolNo || 1)) : 2);

  const yesPercent = totalPool > 0 ? (poolYes / totalPool) * 100 : 50;
  const noPercent = 100 - yesPercent;

  const marketImage = market.image || getMarketImage(market.category, market.title);
  const isClosingSoon = timeRemaining > 0 && timeRemaining < 24 * 60 * 60 * 1000; // Less than 24h

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-200 dark:border-slate-700 overflow-hidden h-full flex flex-col group touch-manipulation">
      <div className="p-4 sm:p-5 flex flex-col flex-grow relative z-10">
        {/* Header with Title and Thumbnail */}
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex-grow">
            <div className="flex items-center gap-2 mb-2">
              {/* Category Tag */}
              <div className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border border-slate-200 dark:border-slate-600">
                {market.category}
              </div>

              {/* Live Badge - Moved here for clarity */}
              {isOpen && (
                <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800/50">
                  <span className="flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                  </span>
                  <span className="text-[8px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tighter">LIVE</span>
                </div>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">
              {market.title}
            </h3>
          </div>

          {/* Small Thumbnail */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-slate-50 dark:bg-slate-900">
              <img
                src={imgError ? "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800" : marketImage}
                alt={market.title}
                loading="lazy"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            </div>
          </div>
        </div>



        {/* Odds Grid */}
        <div className="flex-grow mb-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => isOpen && onPlaceWager("yes")}
              disabled={!isOpen}
              className="relative overflow-hidden bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border-2 border-green-200 dark:border-green-800/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale group/yes"
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-green-600 dark:text-green-400 mb-1">BUY YES</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {oddsYes.toFixed(2)}<span className="text-xs ml-0.5">x</span>
                </span>
              </div>
            </button>

            <button
              onClick={() => isOpen && onPlaceWager("no")}
              disabled={!isOpen}
              className="relative overflow-hidden bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border-2 border-red-200 dark:border-red-800/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale group/no"
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 mb-1">BUY NO</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {oddsNo.toFixed(2)}<span className="text-xs ml-0.5">x</span>
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
            <span>Vol: ${totalPool.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
          <div className={`flex items-center px-2 py-1 rounded ${isClosingSoon ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-700'}`}>
            <Clock className={`h-3 w-3 mr-1 ${isClosingSoon ? 'animate-pulse' : ''}`} />
            <span>{timeRemaining > 0 ? formatCountdown(timeRemaining) : 'Closed'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import { Market } from "@/types";
import { Clock } from "lucide-react";

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
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  } else if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  } else {
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  }
}

export default function MarketCard({ market, onPlaceWager }: MarketCardProps) {
  const isOpen = market.status === "OPEN";
  // Handle both string and number timestamps
  const closureTimestamp = typeof market.closure_timestamp === "string" 
    ? parseInt(market.closure_timestamp) 
    : market.closure_timestamp;
  
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = closureTimestamp - now;
      setTimeRemaining(remaining);
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [closureTimestamp]);

  const poolYes = parseFloat(market.pool_yes);
  const poolNo = parseFloat(market.pool_no);
  const totalPool = parseFloat(market.total_pool);
  
  // Use provided odds if available, otherwise calculate implied odds
  const oddsYes = market.odds?.yes || (totalPool / poolYes);
  const oddsNo = market.odds?.no || (totalPool / poolNo);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 dark:border-slate-700 overflow-hidden h-full flex flex-col group touch-manipulation">
      <div className="p-4 sm:p-5 flex flex-col flex-grow">
        {/* Header Section */}
        <div className="mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-snug">
            {market.title}
          </h3>
        </div>

        {/* Odds Section */}
        <div className="flex-grow mb-3">
          <div className="grid grid-cols-2 gap-2">
            {/* YES Box */}
            <button
              onClick={() => isOpen && onPlaceWager("yes")}
              disabled={!isOpen}
              className="hover-yes relative bg-white dark:bg-slate-800 rounded-lg p-2 min-h-[60px] border-2 border-green-200 dark:border-green-800 transition-all duration-200 cursor-pointer group/yes touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed disabled:border-slate-200 dark:disabled:border-slate-700"
            >
              <div className="flex flex-col items-center text-center justify-center h-full">
                <div className="text-slate-500 dark:text-slate-400 text-[8px] font-medium uppercase tracking-wider mb-0.5">
                  YES
                </div>
                <div className="text-slate-900 dark:text-white text-base sm:text-lg font-bold">
                  {oddsYes.toFixed(2)}<span className="text-[10px] text-slate-500 dark:text-slate-400">x</span>
                </div>
              </div>
            </button>

            {/* NO Box */}
            <button
              onClick={() => isOpen && onPlaceWager("no")}
              disabled={!isOpen}
              className="hover-no relative bg-white dark:bg-slate-800 rounded-lg p-2 min-h-[60px] border-2 border-red-200 dark:border-red-800 transition-all duration-200 cursor-pointer group/no touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed disabled:border-slate-200 dark:disabled:border-slate-700"
            >
              <div className="flex flex-col items-center text-center justify-center h-full">
                <div className="text-slate-500 dark:text-slate-400 text-[8px] font-medium uppercase tracking-wider mb-0.5">
                  NO
                </div>
                <div className="text-slate-900 dark:text-white text-base sm:text-lg font-bold">
                  {oddsNo.toFixed(2)}<span className="text-[10px] text-slate-500 dark:text-slate-400">x</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer Section */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-row items-center justify-between gap-2">
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Volume: ${totalPool.toFixed(2)}</span>
            </div>
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
              <Clock className="h-3 w-3 mr-1" />
              <span className="font-medium">
                {timeRemaining > 0 ? (
                  <span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{formatCountdown(timeRemaining)}</span>
                  </span>
                ) : (
                  <span>Closed</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


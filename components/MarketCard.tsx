"use client";

import { useState, useEffect } from "react";
import { Market } from "@/types";
import { Clock } from "lucide-react";

interface MarketCardProps {
  market: Market;
  onPlaceWager: (selection: string) => void;
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
  const closureTimestamp = typeof market.closure_timestamp === "string"
    ? parseInt(market.closure_timestamp)
    : market.closure_timestamp || 0;

  const [timeRemaining, setTimeRemaining] = useState<number>(0);

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

  const poolYes = parseFloat(market.pool_yes || "0") || 0;
  const poolNo = parseFloat(market.pool_no || "0") || 0;
  const totalPool = parseFloat(market.total_pool || "0") || (poolYes + poolNo);

  const isMulti = market.market_type === "MULTI" || (Array.isArray(market.options) && market.options.length > 0);

  // Unified options list: BINARY defaults to ["Yes", "No"]
  const rawOptions = isMulti
    ? (market.options && market.options.length > 0 ? market.options : Object.keys(market.pools || {}))
    : ["Yes", "No"];

  const optionsList = rawOptions.length > 0 ? rawOptions : ["Yes", "No"];

  // BINARY calculation fallbacks
  const oddsYesVal = typeof market.odds?.yes === "number" ? market.odds.yes : (typeof market.odds?.yes === "object" ? market.odds.yes.decimalOdds : null);
  const oddsNoVal = typeof market.odds?.no === "number" ? market.odds.no : (typeof market.odds?.no === "object" ? market.odds.no.decimalOdds : null);
  const oddsYes = oddsYesVal || (totalPool > 0 && poolYes > 0 ? (totalPool / poolYes) : 2.0);
  const oddsNo = oddsNoVal || (totalPool > 0 && poolNo > 0 ? (totalPool / poolNo) : 2.0);

  const yesPercent =
    market.metrics?.yesPercent != null
      ? Number(market.metrics.yesPercent)
      : market.metrics?.percentage != null
        ? Number(market.metrics.percentage)
        : totalPool > 0
          ? (poolYes / totalPool) * 100
          : 50;
  const noPercent = market.metrics?.noPercent != null ? Number(market.metrics.noPercent) : 100 - yesPercent;

  const isClosingSoon = timeRemaining > 0 && timeRemaining < 24 * 60 * 60 * 1000;

  // Helper for option details (odds & probability)
  const getOptionDetails = (optionLabel: string) => {
    const optKey = optionLabel.toLowerCase();

    if (!isMulti) {
      if (optKey === "yes") return { optKey: "yes", odds: oddsYes, percent: yesPercent };
      if (optKey === "no") return { optKey: "no", odds: oddsNo, percent: noPercent };
    }

    const poolAmt = typeof market.pools?.[optKey] === "number"
      ? (market.pools[optKey] as number)
      : parseFloat(String(market.pools?.[optKey] || market.pool_data?.[optKey] || "0")) || 0;

    let odds = 2.0;
    const rawOdds = market.odds?.[optKey];
    if (rawOdds != null) {
      if (typeof rawOdds === "number") odds = rawOdds;
      else if (typeof rawOdds === "object" && typeof rawOdds.decimalOdds === "number") odds = rawOdds.decimalOdds;
    } else if (totalPool > 0 && poolAmt > 0) {
      odds = totalPool / poolAmt;
    }

    let percent = 50;
    if (market.probabilities && typeof market.probabilities[optKey] === "number") {
      const p = market.probabilities[optKey];
      percent = p <= 1 ? p * 100 : p;
    } else if (market.metrics && market.metrics[optKey] != null) {
      const m = market.metrics[optKey];
      if (typeof m === "number") {
        percent = m <= 1 ? m * 100 : m;
      } else if (typeof m === "object" && m.probability) {
        const parsed = parseFloat(String(m.probability).replace("%", ""));
        if (!isNaN(parsed)) percent = parsed;
      }
    } else if (totalPool > 0 && poolAmt > 0) {
      percent = (poolAmt / totalPool) * 100;
    } else if (optionsList.length > 0) {
      percent = 100 / optionsList.length;
    }

    return { optKey, odds, percent };
  };

  // Determine uniform grid layout based on option count
  const getGridColsClass = (count: number) => {
    if (count <= 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-3";
    if (count === 4) return "grid-cols-2 sm:grid-cols-4";
    return "grid-cols-2 sm:grid-cols-3";
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-200 dark:border-slate-700 overflow-hidden h-full flex flex-col justify-between group touch-manipulation">
      <div className="p-4 sm:p-5 flex flex-col flex-grow relative z-10 justify-between">
        <div>
          {/* Header Badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {/* Category Tag */}
            <div className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-700/80 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider border border-slate-200 dark:border-slate-600">
              {market.category}
            </div>

            {/* Market Type Tag */}
            <div className="inline-block px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 rounded-md text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider border border-indigo-200 dark:border-indigo-800/60">
              {isMulti ? "MULTI-OPTION" : "BINARY"}
            </div>

            {/* Live Badge */}
            {isOpen && (
              <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 rounded-md border border-red-200 dark:border-red-800/50">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                </span>
                <span className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">LIVE</span>
              </div>
            )}
          </div>

          {/* Market Title */}
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight mb-4 min-h-[44px] flex items-center">
            {market.title}
          </h3>
        </div>

        {/* Options Grid (Consistent across Binary and Multi) */}
        <div className="mb-4">
          <div className={`grid gap-2.5 ${getGridColsClass(optionsList.length)}`}>
            {optionsList.map((optionLabel) => {
              const { optKey, odds, percent } = getOptionDetails(optionLabel);
              const isYes = optKey === "yes";
              const isNo = optKey === "no";

              // Color themes: Yes = Green, No = Red, Multi = Indigo/Slate
              const themeClasses = isYes
                ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                : isNo
                ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                : "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50";

              return (
                <button
                  key={optKey}
                  onClick={() => isOpen && onPlaceWager(optKey)}
                  disabled={!isOpen}
                  className={`relative overflow-hidden rounded-xl p-3 border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-sm active:scale-95 disabled:opacity-50 disabled:grayscale flex flex-col items-center justify-center min-h-[64px] ${themeClasses}`}
                >
                  <span className="text-[11px] font-bold uppercase truncate max-w-full leading-tight mb-1 text-center">
                    {!isMulti && isYes ? "BUY YES" : !isMulti && isNo ? "BUY NO" : optionLabel}
                  </span>
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-none">
                    {odds.toFixed(2)}<span className="text-xs font-semibold ml-0.5">x</span>
                  </span>
                  <span className="text-[10px] font-semibold opacity-80 mt-1">
                    {percent.toFixed(0)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Metadata Bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-md">
            <span>Vol: ${totalPool.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
          <div className={`flex items-center px-2.5 py-1 rounded-md ${isClosingSoon ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50' : 'bg-slate-100 dark:bg-slate-700/60'}`}>
            <Clock className={`h-3 w-3 mr-1 ${isClosingSoon ? 'animate-pulse' : ''}`} />
            <span>{timeRemaining > 0 ? formatCountdown(timeRemaining) : 'Closed'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Market, WagerResponse } from "@/types";
import { api } from "@/lib/api";
import { wallet } from "@/lib/wallet";
import { transactions } from "@/lib/transactions";
import { X, CheckCircle, AlertCircle } from "lucide-react";

interface WagerModalProps {
  market: Market;
  onClose: () => void;
  onSuccess: (result?: WagerResponse) => void;
  preSelected?: string;
}

export default function WagerModal({ market, onClose, onSuccess, preSelected }: WagerModalProps) {
  const isMulti = market.market_type === "MULTI" || (Array.isArray(market.options) && market.options.length > 0);
  const options = isMulti ? (market.options && market.options.length > 0 ? market.options : Object.keys(market.pools || {})) : ["Yes", "No"];

  const defaultSelection = preSelected
    ? preSelected.toLowerCase()
    : (isMulti && options.length > 0 ? options[0].toLowerCase() : "yes");

  const [selection, setSelection] = useState<string>(defaultSelection);
  const [stake, setStake] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [wagerResult, setWagerResult] = useState<WagerResponse | null>(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    // Load balance asynchronously
    const loadBalance = async () => {
      const currentBalance = await wallet.getBalance(true);
      setBalance(currentBalance);
      // Set default stake to $10 or balance, whichever is smaller
      const defaultStake = Math.min(10, currentBalance);
      setStake(defaultStake > 0 ? defaultStake.toFixed(2) : "0.01");
    };
    loadBalance();
    if (preSelected) {
      setSelection(preSelected.toLowerCase());
    }
  }, [preSelected]);

  // Watch for balance changes and cap stake if it exceeds balance
  useEffect(() => {
    const currentStake = parseFloat(stake) || 0;
    if (currentStake > balance && balance > 0) {
      setStake(Math.min(currentStake, balance).toFixed(2));
    }
  }, [balance, stake]);

  const poolYes = parseFloat(market.pool_yes || "0") || 0;
  const poolNo = parseFloat(market.pool_no || "0") || 0;
  const totalPool = parseFloat(market.total_pool || "0") || poolYes + poolNo;

  // Calculate odds for current selection
  const getOddsForSelection = (selKey: string): number => {
    const key = selKey.toLowerCase();
    const rawOdds = market.odds?.[key];
    if (rawOdds != null) {
      if (typeof rawOdds === "number") return rawOdds;
      if (typeof rawOdds === "object" && typeof rawOdds.decimalOdds === "number") return rawOdds.decimalOdds;
    }
    if (market.metrics && market.metrics[key] != null) {
      const m = market.metrics[key];
      if (typeof m === "number") return m;
      if (typeof m === "object" && typeof m.decimalOdds === "number") return m.decimalOdds;
    }
    if (isMulti) {
      const poolAmt = typeof market.pools?.[key] === "number"
        ? (market.pools[key] as number)
        : parseFloat(String(market.pools?.[key] || market.pool_data?.[key] || "0")) || 0;
      if (totalPool > 0 && poolAmt > 0) return totalPool / poolAmt;
      return 2.0;
    } else {
      if (key === "yes") return totalPool > 0 && poolYes > 0 ? totalPool / poolYes : 1.5;
      if (key === "no") return totalPool > 0 && poolNo > 0 ? totalPool / poolNo : 1.5;
      return 2.0;
    }
  };

  // Calculate percentage share for current selection
  const getPercentForSelection = (selKey: string): number => {
    const key = selKey.toLowerCase();
    if (market.probabilities && typeof market.probabilities[key] === "number") {
      const p = market.probabilities[key];
      return p <= 1 ? p * 100 : p;
    }
    if (market.metrics && market.metrics[key] != null) {
      const m = market.metrics[key];
      if (typeof m === "number") return m <= 1 ? m * 100 : m;
      if (typeof m === "object" && m.probability) {
        const parsed = parseFloat(String(m.probability).replace("%", ""));
        if (!isNaN(parsed)) return parsed;
      }
    }
    if (isMulti) {
      const poolAmt = typeof market.pools?.[key] === "number"
        ? (market.pools[key] as number)
        : parseFloat(String(market.pools?.[key] || market.pool_data?.[key] || "0")) || 0;
      if (totalPool > 0 && poolAmt > 0) return (poolAmt / totalPool) * 100;
      return options.length > 0 ? 100 / options.length : 50;
    } else {
      if (key === "yes") return poolYes > 0 && totalPool > 0 ? (poolYes / totalPool) * 100 : 50;
      if (key === "no") return poolNo > 0 && totalPool > 0 ? (poolNo / totalPool) * 100 : 50;
      return 50;
    }
  };

  const selectedOdds = getOddsForSelection(selection);
  const stakeAmount = parseFloat(stake) || 0;
  const potentialWin = stakeAmount * selectedOdds;

  // Format closure date
  const closureDate = new Date(
    typeof market.closure_timestamp === "string"
      ? parseInt(market.closure_timestamp)
      : market.closure_timestamp || Date.now()
  );
  const formattedDate = closureDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric"
  });

  // Display label for selection
  const getSelectionLabel = (selKey: string): string => {
    const key = selKey.toLowerCase();
    if (isMulti) {
      const found = options.find(o => o.toLowerCase() === key);
      return found || selKey.toUpperCase();
    }
    return key === "yes" ? "Yes" : key === "no" ? "No" : selKey.toUpperCase();
  };

  const handleIncrement = (amount: number) => {
    const current = parseFloat(stake) || 0;
    const newAmount = Math.min(Math.max(current + amount, 0.01), balance);
    setStake(newAmount.toFixed(2));
    setError(null);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = parseFloat(e.target.value);
    const newAmount = Math.min((balance * percentage) / 100, balance);
    setStake(Math.min(newAmount, balance).toFixed(2));
    setError(null);
  };

  const sliderValue = balance > 0 ? Math.min(((stakeAmount / balance) * 100), 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const stakeAmount = parseFloat(stake);
    if (isNaN(stakeAmount) || stakeAmount <= 0) {
      setError("Please enter a valid stake amount");
      return;
    }

    // Refresh balance from database and check if withdrawal is possible
    const currentBalance = await wallet.getBalance(true);
    if (stakeAmount > currentBalance) {
      setBalance(currentBalance);
      setError(`Insufficient balance. You have $${currentBalance.toFixed(2)} available.`);
      return;
    }

    setLoading(true);
    try {
      const result = await api.placeWager({
        marketId: market.id,
        selection: selection.toLowerCase(),
        stake: stakeAmount,
        marketTitle: market.title,
      });

      // Refresh balance after successful wager (deduction happens on server)
      const newBalance = await wallet.getBalance(true);
      setBalance(newBalance);

      // Save transaction (get user email if available)
      const userEmail = typeof window !== "undefined"
        ? sessionStorage.getItem("user_email") || undefined
        : undefined;
      await transactions.addTransaction(result, market, userEmail);

      setWagerResult(result);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place wager");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (success && wagerResult) {
      onSuccess(wagerResult);
    } else {
      onClose();
    }
  };

  // Determine uniform grid layout for option buttons in modal
  const getGridColsClass = (count: number) => {
    if (count <= 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-3";
    if (count === 4) return "grid-cols-2 sm:grid-cols-4";
    return "grid-cols-2 sm:grid-cols-3";
  };

  if (success && wagerResult) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Wager Placed Successfully!
            </h2>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 mb-5">
            <div className="flex items-center text-emerald-600 dark:text-emerald-400 mb-3">
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span className="font-bold">Status: {wagerResult.status}</span>
            </div>
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex justify-between border-b border-emerald-100 dark:border-emerald-900/40 pb-1">
                <span className="font-medium text-slate-500 dark:text-slate-400">Wager ID:</span>
                <span className="font-mono text-xs">{wagerResult.wagerId}</span>
              </div>
              <div className="flex justify-between border-b border-emerald-100 dark:border-emerald-900/40 pb-1">
                <span className="font-medium text-slate-500 dark:text-slate-400">Selection:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{getSelectionLabel(wagerResult.selection)}</span>
              </div>
              <div className="flex justify-between border-b border-emerald-100 dark:border-emerald-900/40 pb-1">
                <span className="font-medium text-slate-500 dark:text-slate-400">Stake:</span>
                <span className="font-bold">${wagerResult.stake.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-emerald-100 dark:border-emerald-900/40 pb-1">
                <span className="font-medium text-slate-500 dark:text-slate-400">Odds:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedOdds ? `${selectedOdds.toFixed(2)}x` : "—"}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-medium text-slate-500 dark:text-slate-400">Possible Winning:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {(() => {
                    const fromB2B = wagerResult.potentialWin;
                    if (fromB2B != null && !isNaN(fromB2B) && fromB2B >= 0) {
                      return `$${Number(fromB2B).toFixed(2)}`;
                    }
                    if (potentialWin > wagerResult.stake) {
                      return `$${potentialWin.toFixed(2)}`;
                    }
                    return "—";
                  })()}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-indigo-500/25"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
              {isMulti ? "Multi-Option Market" : "Binary Market"}
            </span>
            <span className="text-slate-400 text-xs font-medium">• {formattedDate}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5">
          <h3 className="text-lg font-bold text-white leading-snug">{market.title}</h3>
        </div>

        {/* Outcome Selection Grid (Aligned Grid across all Option Counts) */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
            Select Your Outcome
          </label>
          <div className={`grid gap-2.5 ${getGridColsClass(options.length)}`}>
            {options.map((optLabel) => {
              const optKey = optLabel.toLowerCase();
              const isSelected = selection === optKey;
              const oddsVal = getOddsForSelection(optKey);
              const percentVal = getPercentForSelection(optKey);

              const isYes = optKey === "yes";
              const isNo = optKey === "no";
              const displayLabel = !isMulti && isYes ? "Buy Yes" : !isMulti && isNo ? "Buy No" : optLabel;

              return (
                <button
                  key={optKey}
                  type="button"
                  onClick={() => {
                    setSelection(optKey);
                    setError(null);
                  }}
                  className={`relative p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[60px] touch-manipulation ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400 font-bold scale-[1.02]"
                      : "bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 font-semibold"
                  }`}
                >
                  <span className="text-xs sm:text-sm uppercase truncate w-full leading-tight text-center">
                    {displayLabel}
                  </span>
                  <div className="flex items-center justify-center gap-1.5 mt-1 text-xs">
                    <span className={`font-black ${isSelected ? "text-white" : "text-slate-200"}`}>
                      {oddsVal.toFixed(2)}x
                    </span>
                    <span className={`text-[10px] font-medium ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                      ({percentVal.toFixed(0)}%)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-800 rounded-xl p-3">
            <div className="flex items-center text-red-400">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Amount Input and Quick Increment Buttons */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Wager Amount
              </label>
              <span className="text-xs font-medium text-slate-400">
                Available: ${balance.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-lg font-bold">$</span>
                <input
                  type="number"
                  value={stake}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    const numValue = parseFloat(inputValue);
                    if (!isNaN(numValue)) {
                      const cappedValue = Math.min(numValue, balance);
                      setStake(cappedValue.toFixed(2));
                    } else {
                      setStake(inputValue);
                    }
                    setError(null);
                  }}
                  onBlur={(e) => {
                    const numValue = parseFloat(e.target.value);
                    if (!isNaN(numValue)) {
                      const cappedValue = Math.min(Math.max(numValue, 0.01), balance);
                      setStake(cappedValue.toFixed(2));
                    }
                  }}
                  step="0.01"
                  min="0.01"
                  max={balance}
                  required
                  className="w-full pl-8 pr-4 py-3 bg-slate-700/80 border border-slate-600 rounded-xl text-white text-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="0.00"
                />
              </div>
              <button
                type="button"
                onClick={() => handleIncrement(1)}
                className="px-3.5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all border border-slate-600 touch-manipulation"
              >
                +$1
              </button>
              <button
                type="button"
                onClick={() => handleIncrement(10)}
                className="px-3.5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all border border-slate-600 touch-manipulation"
              >
                +$10
              </button>
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-1.5">
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={handleSliderChange}
              disabled={balance <= 0}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${sliderValue}%, #374151 ${sliderValue}%, #374151 100%)`
              }}
            />
            <div className="flex justify-between text-xs font-semibold text-slate-400">
              <span>$0</span>
              <span>${balance.toFixed(2)}</span>
            </div>
          </div>

          {/* Place Wager Button */}
          <button
            type="submit"
            disabled={loading || !stake || parseFloat(stake) <= 0 || parseFloat(stake) > balance}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base transition-all shadow-lg hover:shadow-emerald-600/25 flex flex-col items-center justify-center touch-manipulation"
          >
            <span>{loading ? "Placing Wager..." : `Confirm Wager on ${getSelectionLabel(selection)}`}</span>
            {stakeAmount > 0 && !loading && (
              <span className="text-emerald-100 text-xs font-normal mt-0.5">
                To win ${potentialWin.toFixed(2)} ({selectedOdds.toFixed(2)}x)
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

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

  if (success && wagerResult) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6">
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

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4">
            <div className="flex items-center text-green-600 dark:text-green-400 mb-2">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span className="font-medium">Status: {wagerResult.status}</span>
            </div>
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <span className="font-medium">Wager ID:</span> {wagerResult.wagerId}
              </div>
              <div>
                <span className="font-medium">Selection:</span> {getSelectionLabel(wagerResult.selection)}
              </div>
              <div>
                <span className="font-medium">Stake:</span> ${wagerResult.stake.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Odds:</span>{" "}
                {selectedOdds ? `${selectedOdds.toFixed(2)}x` : "—"}
              </div>
              <div>
                <span className="font-medium">Possible winning:</span>{" "}
                {(() => {
                  const fromB2B = wagerResult.potentialWin;
                  if (fromB2B != null && !isNaN(fromB2B) && fromB2B >= 0) {
                    return `$${Number(fromB2B).toFixed(2)} (after commission)`;
                  }
                  if (potentialWin > wagerResult.stake) {
                    return `$${potentialWin.toFixed(2)} (before commission)`;
                  }
                  return "— (calculated at settlement, after commission)";
                })()}
              </div>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center">
              <span className="text-white text-xs">📊</span>
            </div>
            <span className="text-white text-sm font-medium">{formattedDate}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-bold text-white leading-snug">{market.title}</h3>
        </div>

        {/* Selection Options Pill Selector */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Select Outcome
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {options.map((optLabel) => {
              const optKey = optLabel.toLowerCase();
              const isSelected = selection === optKey;
              const oddsVal = getOddsForSelection(optKey);
              return (
                <button
                  key={optKey}
                  type="button"
                  onClick={() => {
                    setSelection(optKey);
                    setError(null);
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-bold transition-all flex flex-col items-center justify-center whitespace-nowrap min-w-[70px] ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400"
                      : "bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <span>{optLabel}</span>
                  <span className="text-xs font-semibold opacity-80 mt-0.5">{oddsVal.toFixed(2)}x</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/20 border border-red-800 rounded-lg p-3">
            <div className="flex items-center text-red-400">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Input and Increment Buttons */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-lg">$</span>
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
                className="w-full pl-8 pr-4 py-3 bg-slate-700 dark:bg-slate-800 border border-slate-600 rounded-lg text-white text-lg font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
              />
            </div>
            <button
              type="button"
              onClick={() => handleIncrement(1)}
              className="px-4 py-3 bg-slate-700 dark:bg-slate-800 hover:bg-slate-600 dark:hover:bg-slate-700 text-white rounded-lg font-medium transition-colors touch-manipulation border border-slate-600"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => handleIncrement(10)}
              className="px-4 py-3 bg-slate-700 dark:bg-slate-800 hover:bg-slate-600 dark:hover:bg-slate-700 text-white rounded-lg font-medium transition-colors touch-manipulation border border-slate-600"
            >
              +10
            </button>
          </div>

          {/* Slider */}
          <div className="space-y-2">
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
            <div className="flex justify-between text-xs text-slate-400">
              <span>$0</span>
              <span>${balance.toFixed(2)}</span>
            </div>
          </div>

          {/* Buy Button */}
          <button
            type="submit"
            disabled={loading || !stake || parseFloat(stake) <= 0 || parseFloat(stake) > balance}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-lg transition-colors flex flex-col items-center justify-center touch-manipulation"
          >
            <span>Buy {getSelectionLabel(selection)}</span>
            {stakeAmount > 0 && (
              <span className="text-emerald-200 text-sm font-normal mt-1">
                To win ${potentialWin.toFixed(2)}
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

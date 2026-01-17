"use client";

import { useState, useEffect } from "react";
import { Market } from "@/types";
import { api } from "@/lib/api";
import { wallet } from "@/lib/wallet";
import { transactions } from "@/lib/transactions";
import { X, CheckCircle, AlertCircle } from "lucide-react";

interface WagerModalProps {
  market: Market;
  onClose: () => void;
  onSuccess: () => void;
  preSelected?: "yes" | "no";
}

export default function WagerModal({ market, onClose, onSuccess, preSelected }: WagerModalProps) {
  const [selection, setSelection] = useState<"yes" | "no">(preSelected || "yes");
  const [stake, setStake] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [wagerResult, setWagerResult] = useState<any>(null);
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
      setSelection(preSelected);
    }
  }, [preSelected]);

  // Watch for balance changes and cap stake if it exceeds balance
  useEffect(() => {
    const currentStake = parseFloat(stake) || 0;
    if (currentStake > balance && balance > 0) {
      setStake(Math.min(currentStake, balance).toFixed(2));
    }
  }, [balance, stake]);

  const poolYes = parseFloat(market.pool_yes);
  const poolNo = parseFloat(market.pool_no);
  const totalPool = parseFloat(market.total_pool);
  const oddsYes = market.odds?.yes || (totalPool / poolYes);
  const oddsNo = market.odds?.no || (totalPool / poolNo);

  // Calculate potential winnings
  const stakeAmount = parseFloat(stake) || 0;
  const potentialWin = stakeAmount * (selection === "yes" ? oddsYes : oddsNo);
  const profit = potentialWin - stakeAmount;

  // Format closure date
  const closureDate = new Date(
    typeof market.closure_timestamp === "string"
      ? parseInt(market.closure_timestamp)
      : market.closure_timestamp
  );
  const formattedDate = closureDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric"
  });

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
        selection,
        stake: stakeAmount,
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
    if (success) {
      onSuccess();
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
                <span className="font-medium">Selection:</span> {wagerResult.selection.toUpperCase()}
              </div>
              <div>
                <span className="font-medium">Stake:</span> ${wagerResult.stake.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Odds:</span> {wagerResult.odds[wagerResult.selection].toFixed(2)}x
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
        <div className="flex items-center justify-between mb-6">
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
                  // If valid number, cap it at balance
                  if (!isNaN(numValue)) {
                    const cappedValue = Math.min(numValue, balance);
                    setStake(cappedValue.toFixed(2));
                  } else {
                    setStake(inputValue);
                  }
                  setError(null);
                }}
                onBlur={(e) => {
                  // On blur, ensure value doesn't exceed balance
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
            <span>Buy {selection === "yes" ? "Yes" : "No"}</span>
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



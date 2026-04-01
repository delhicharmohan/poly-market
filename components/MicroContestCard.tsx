"use client";

import { useState } from "react";
import { IplMicroContest, WagerResponse } from "@/types";
import { api } from "@/lib/api";
import { Zap, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import { wallet } from "@/lib/wallet";
import { transactions } from "@/lib/transactions";
import { MarketCategory, MarketTerm } from "@/types";

export default function MicroContestCard({ contest }: { contest: IplMicroContest }) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [stake, setStake] = useState<string>("10.00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<WagerResponse | null>(null);

  const totalPool = parseFloat(contest.total_pool) || 0;
  
  const handleWager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) {
      setError("Please select an outcome");
      return;
    }

    const amount = parseFloat(stake);
    if (isNaN(amount) || amount <= 0) {
      setError("Invalid stake amount");
      return;
    }

    // Refresh balance check
    const currentBalance = await wallet.getBalance(true);
    if (amount > currentBalance) {
      setError(`Insufficient balance. You have $${currentBalance.toFixed(2)}.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await api.placeWager({
        marketId: contest.market_id,
        selection: selectedOption,
        stake: amount
      });
      
      await wallet.getBalance(true);
      
      const userEmail = typeof window !== "undefined"
        ? sessionStorage.getItem("user_email") || undefined
        : undefined;
        
      await transactions.addTransaction(result, {
        id: contest.market_id,
        title: contest.title,
        status: "OPEN",
        category: "Cricket" as MarketCategory,
        term: "Ultra Short" as MarketTerm,
        pool_yes: "",
        pool_no: "",
        total_pool: contest.total_pool,
        closure_timestamp: Date.now() + 180000 // roughly 3 mins from now
      }, userEmail);

      setSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place wager");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-900 border border-emerald-500 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-20">
          <CheckCircle className="w-24 h-24 text-emerald-400" />
        </div>
        <div className="relative z-10 text-white">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-emerald-400 w-6 h-6" />
            <h3 className="font-bold text-lg">Wager Accepted!</h3>
          </div>
          <p className="font-semibold text-emerald-200">
            {contest.title}
          </p>
          <div className="mt-3 bg-emerald-800/50 p-3 rounded-lg flex justify-between items-center text-sm font-mono text-emerald-100">
            <div>
              <span className="block text-emerald-400 text-xs tracking-wider uppercase">Selection</span>
              {success.selection}
            </div>
            <div className="text-right">
              <span className="block text-emerald-400 text-xs tracking-wider uppercase">Stake</span>
              ${success.stake.toFixed(2)}
            </div>
          </div>
          <p className="mt-4 text-xs text-emerald-300 italic">
            Awaiting settlement at the end of the over.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-5 border border-indigo-500/30 overflow-hidden relative">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-indigo-100 font-bold text-lg mb-1">{contest.title}</h3>
          <p className="text-indigo-300/60 text-xs font-medium uppercase tracking-wider flex items-center">
             <TrendingUp className="w-3 h-3 mr-1" />
            Total Pool: ${totalPool.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {Object.entries(contest.pools || {}).map(([key, amount]) => {
          const poolAmt = typeof amount === "number" ? amount : (parseFloat(amount) || 0);
          const ratio = (poolAmt > 0 && totalPool > 0) ? (poolAmt / totalPool) * 100 : 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedOption(key)}
              className={`relative overflow-hidden p-3 rounded-lg border text-left transition-all ${
                selectedOption === key 
                  ? "bg-indigo-600/30 border-indigo-400 ring-1 ring-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                  : "bg-slate-900/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800"
              }`}
            >
              {/* Pool percentage bar background */}
              <div 
                className="absolute left-0 bottom-0 h-1 bg-indigo-500/40 rounded-b-lg transition-all" 
                style={{ width: `${ratio}%` }} 
              />
              <div className="relative z-10 flex justify-between items-center">
                <span className="text-slate-200 font-bold capitalize">{key}</span>
                <span className="text-slate-400 text-xs font-mono">${poolAmt.toFixed(0)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-800 rounded-lg p-3 flex items-center text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {selectedOption && (
        <form onSubmit={handleWager} className="pt-4 border-t border-slate-700 animate-fadeInUp">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                min="0.50"
                step="0.50"
                value={stake}
                onChange={(e) => {
                  setStake(e.target.value);
                  setError(null);
                }}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg py-2.5 pl-7 pr-3 focus:ring-2 focus:ring-indigo-500 font-mono transition-all"
                placeholder="10.00"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-lg transition-all disabled:opacity-50 flex items-center whitespace-nowrap"
            >
              {loading ? "Placing..." : "Confirm Bet"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

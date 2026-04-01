"use client";

import React, { useState } from "react";
import { X, Zap, Loader2, AlertCircle } from "lucide-react";
import { dbClient } from "@/lib/db-client";
import { triggerConfetti } from "@/lib/confetti";

interface CreateChallengeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateChallengeModal({ onClose, onSuccess }: CreateChallengeModalProps) {
  const [topic, setTopic] = useState("");
  const [outcomeX, setOutcomeX] = useState("Yes");
  const [outcomeY, setOutcomeY] = useState("No");
  const [stake, setStake] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const stakeNum = parseFloat(stake);
    if (!topic.trim()) return setError("Please enter a topic");
    if (isNaN(stakeNum) || stakeNum <= 0) return setError("Please enter a valid stake amount");

    setLoading(true);
    try {
      await dbClient.createChallenge({
        topic: topic.trim(),
        outcome_x: outcomeX.trim(),
        outcome_y: outcomeY.trim(),
        target_stake: stakeNum,
      });
      
      triggerConfetti();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to create challenge");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500 fill-blue-500/10" />
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Create Challenge</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-200">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">What's the challenge?</label>
            <textarea 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. India will win the T20 World Cup 2026"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 h-24 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">My Outcome (X)</label>
              <input 
                value={outcomeX}
                onChange={(e) => setOutcomeX(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Friend's Outcome (Y)</label>
              <input 
                value={outcomeY}
                onChange={(e) => setOutcomeY(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Stake Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
              <input 
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-white font-mono text-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <p className="text-[10px] text-slate-500 ml-1">You will be betting this amount on Outcome X.</p>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2 mt-4 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
            {loading ? "Creating..." : "Launch Challenge"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Zap, Users, Share2, Timer, ArrowLeft, Loader2, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { dbClient } from "@/lib/db-client";
import { triggerConfetti } from "@/lib/confetti";
import { wallet } from "@/lib/wallet";

export default function ChallengeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [joinAmount, setJoinAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);

  const fetchChallenge = useCallback(async () => {
    try {
      const data = await dbClient.getChallenge(id as string);
      if (!data) {
        router.push("/challenges");
        return;
      }
      setChallenge(data);
    } catch (err) {
      console.error("Error fetching challenge:", err);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchChallenge();
    wallet.getBalance(true).then(setBalance);
  }, [fetchChallenge]);

  const handleJoin = async (side: "X" | "Y") => {
    setError(null);
    const amount = parseFloat(joinAmount);
    if (isNaN(amount) || amount <= 0) return setError("Please enter a valid amount");
    if (amount > balance) return setError("Insufficient balance");

    setJoining(true);
    try {
      await dbClient.joinChallenge(id as string, { side, amount });
      triggerConfetti();
      setJoinAmount("");
      await fetchChallenge();
      await wallet.getBalance(true).then(setBalance);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to join challenge");
    } finally {
      setJoining(false);
    }
  };

  const handleResolve = async (winningSide: "X" | "Y") => {
    if (!confirm(`Are you sure you want to resolve this challenge for ${winningSide === 'X' ? challenge.outcome_x : challenge.outcome_y}? This will distribute payouts immediately.`)) return;
    
    setResolving(true);
    try {
      await dbClient.resolveChallenge(id as string, winningSide);
      triggerConfetti();
      await fetchChallenge();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to resolve challenge");
    } finally {
      setResolving(false);
    }
  };

  const shareOnWhatsApp = () => {
    const text = `I challenge you! 🥊\n\nTopic: "${challenge.topic}"\n\nI'm betting on: ${challenge.outcome_x}\n\nJoin the challenge here: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const isPending = challenge.status === "PENDING";
  const isActive = challenge.status === "ACTIVE";
  const isSettled = challenge.status === "SETTLED";

  const totalX = parseFloat(challenge.total_side_x);
  const totalY = parseFloat(challenge.total_side_y);
  const targetStake = parseFloat(challenge.target_stake);
  const remainingY = Math.max(targetStake - totalY, 0);
  const progressY = Math.min((totalY / targetStake) * 100, 100);

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto">
      <Link href="/challenges" className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Challenges</span>
      </Link>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-6 shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Zap className="h-6 w-6 text-blue-500 fill-blue-500/20" />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">P2P Challenge</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-400 font-bold">Created by {challenge.creator_name}</span>
              </div>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
            isPending ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : 
            isActive ? "bg-green-500/10 text-green-500 border border-green-500/20" : 
            "bg-slate-700/50 text-slate-400 border border-slate-600/50"
          }`}>
            {challenge.status}
          </div>
        </div>

        <h1 className="text-2xl font-black text-white mb-8 leading-tight">
          {challenge.topic}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className={`p-5 rounded-2xl border transition-all ${totalX > 0 ? "bg-blue-500/5 border-blue-500/20" : "bg-slate-800/50 border-slate-700/50"}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Outcome X</span>
              <span className="text-blue-400 font-black">₹{totalX}</span>
            </div>
            <p className="text-lg font-bold text-white mb-4">{challenge.outcome_x}</p>
            {isActive && (
              <button 
                onClick={() => { setJoinAmount(remainingY.toString()); handleJoin('X'); }}
                disabled={joining || isSettled}
                className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-xs font-bold transition-all"
              >
                Back this side
              </button>
            )}
          </div>

          <div className={`p-5 rounded-2xl border transition-all ${totalY > 0 ? "bg-rose-500/5 border-rose-500/20" : "bg-slate-800/50 border-slate-700/50"}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Outcome Y</span>
              <span className="text-rose-400 font-black">₹{totalY}</span>
            </div>
            <p className="text-lg font-bold text-white mb-4">{challenge.outcome_y}</p>
            {(isPending || isActive) && (
              <button 
                onClick={() => { setJoinAmount(remainingY.toString() || "10"); handleJoin('Y'); }}
                disabled={joining || isSettled}
                className="w-full py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-xl text-xs font-bold transition-all"
              >
                Join this side
              </button>
            )}
          </div>
        </div>

        {isPending && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 mb-8">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-400 font-bold uppercase">Acceptance Progress</span>
              <span className="text-white font-black">₹{remainingY} remaining</span>
            </div>
            <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000" 
                style={{ width: `${progressY}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 italic">Challenge becomes ACTIVE once side Y is fully matched.</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-200">{error}</p>
          </div>
        )}

        {!isSettled && (
          <div className="space-y-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
              <input 
                type="number"
                value={joinAmount}
                onChange={(e) => setJoinAmount(e.target.value)}
                placeholder="Enter amount to bet..."
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-8 pr-4 py-4 text-white font-mono text-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                 <button onClick={() => setJoinAmount('10')} className="px-2 py-1 bg-slate-700 rounded-lg text-[10px] text-white">₹10</button>
                 <button onClick={() => setJoinAmount('50')} className="px-2 py-1 bg-slate-700 rounded-lg text-[10px] text-white">₹50</button>
                 {isPending && <button onClick={() => setJoinAmount(remainingY.toString())} className="px-2 py-1 bg-blue-600/50 rounded-lg text-[10px] text-white">MAX</button>}
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={shareOnWhatsApp}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="h-5 w-5" />
                Invite Friends
              </button>
            </div>
          </div>
        )}

        {isSettled && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Challenge Settled</h3>
            <p className="text-slate-400 text-sm mt-1">Winning funds have been distributed proportionally to all winners.</p>
          </div>
        )}
      </div>

      {isActive && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Settle Challenge</h3>
          </div>
          <p className="text-xs text-slate-500 mb-6">As the creator/referee, select the final outcome to distribute the pool.</p>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleResolve('X')}
              disabled={resolving}
              className="py-4 bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 text-white font-bold rounded-2xl transition-all"
            >
              Outcome X Won
            </button>
            <button 
              onClick={() => handleResolve('Y')}
              disabled={resolving}
              className="py-4 bg-slate-800 hover:bg-rose-600 border border-slate-700 hover:border-rose-500 text-white font-bold rounded-2xl transition-all"
            >
              Outcome Y Won
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { Zap, Users, Share2, Timer } from "lucide-react";
import Link from "next/link";

interface ChallengeCardProps {
  challenge: {
    id: string;
    topic: string;
    outcome_x: string;
    outcome_y: string;
    target_stake: number;
    total_side_x: number;
    total_side_y: number;
    status: string;
    creator_name: string;
    expires_at: string;
  };
}

export default function ChallengeCard({ challenge }: ChallengeCardProps) {
  const targetStake = parseFloat(challenge.target_stake.toString());
  const totalY = parseFloat(challenge.total_side_y.toString());
  const progressY = Math.min((totalY / targetStake) * 100, 100);
  
  const isPending = challenge.status === "PENDING";
  const isActive = challenge.status === "ACTIVE";

  return (
    <Link href={`/challenges/${challenge.id}`}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-blue-500/50 transition-all cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
              <Zap className="h-4 w-4 text-blue-400" />
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              1v1 Challenge
            </span>
          </div>
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            isPending ? "bg-amber-500/10 text-amber-500" : 
            isActive ? "bg-green-500/10 text-green-500" : 
            "bg-slate-700 text-slate-400"
          }`}>
            {challenge.status}
          </div>
        </div>

        <h3 className="text-lg font-bold text-white mb-4 line-clamp-2">
          {challenge.topic}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
            <span className="text-[10px] text-slate-500 block mb-1">Outcome X</span>
            <span className="text-sm font-semibold text-white">{challenge.outcome_x}</span>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
            <span className="text-[10px] text-slate-500 block mb-1">Outcome Y</span>
            <span className="text-sm font-semibold text-white">{challenge.outcome_y}</span>
          </div>
        </div>

        {isPending && (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Match Progress (Side Y)</span>
              <span className="text-blue-400 font-medium">₹{totalY} / ₹{targetStake}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500" 
                style={{ width: `${progressY}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-[10px] text-white font-bold">{challenge.creator_name[0]}</span>
            </div>
            <span className="text-xs text-slate-400">{challenge.creator_name}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <Timer className="h-3 w-3" />
            <span className="text-[10px]">Expiring soon</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

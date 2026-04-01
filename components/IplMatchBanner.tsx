"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { IplMatch } from "@/types";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function IplMatchBanner() {
  const [liveMatches, setLiveMatches] = useState<IplMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchLiveMatches = async () => {
      try {
        const data = await api.getIplMatches("LIVE");
        if (mounted && data.matches) {
          setLiveMatches(data.matches);
        }
      } catch (error) {
        console.error("Failed to fetch live IPL matches:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchLiveMatches();
    
    // Poll every 60s as suggested in the guide
    const intervalId = setInterval(fetchLiveMatches, 60000);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  if (loading || liveMatches.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-r from-blue-900 to-indigo-900 overflow-hidden mb-6 relative group rounded-xl shadow-lg border border-indigo-500/30">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Zap className="w-32 h-32 text-yellow-400" />
      </div>
      <div className="p-4 sm:p-6 relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-red-400 font-bold text-xs tracking-wider uppercase">Live IPL Match</span>
          </div>
          {liveMatches.map(match => (
            <div key={match.id} className="mb-2 last:mb-0">
              <h3 className="text-white text-lg sm:text-xl font-bold font-sans">
                {match.team_a.short_name} vs {match.team_b.short_name}
              </h3>
              <p className="text-indigo-200 text-sm">{match.venue}</p>
            </div>
          ))}
        </div>
        
        <Link href={`/ipl/${liveMatches[0].roanuz_key}`} className="shrink-0 bg-yellow-400 hover:bg-yellow-300 text-indigo-950 px-6 py-2 rounded-lg font-bold text-sm shadow-[0_0_15px_rgba(250,204,21,0.4)] transition-all hover:scale-105 active:scale-95 whitespace-nowrap">
          Bet Live Over
        </Link>
      </div>
    </div>
  );
}

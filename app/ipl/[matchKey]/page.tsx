"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import { IplMatch, IplMicroContest } from "@/types";
import { ArrowLeft, Zap, Info } from "lucide-react";
import Link from "next/link";
import MicroContestCard from "@/components/MicroContestCard";

export default function IplMatchPage() {
  const { matchKey } = useParams() as { matchKey: string };
  const router = useRouter();
  const [matchInfo, setMatchInfo] = useState<IplMatch | null>(null);
  const [scoreData, setScoreData] = useState<any>(null);
  const [microContests, setMicroContests] = useState<IplMicroContest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let socket: Socket;

    const init = async () => {
      try {
        setLoading(true);
        // Load initial match data & open contests
        const matchData = await api.getIplMatchDetail(matchKey);
        const microData = await api.getIplMicroContests(matchKey);
        
        if (mounted) {
          setMatchInfo(matchData.match);
          if (matchData.match?.score) setScoreData(matchData.match.score);
          setMicroContests(microData.microContests || []);
        }

        // Initialize WebSocket connection
        socket = io("https://antigravity-b2b.onrender.com", { transports: ['websocket'] });
        
        socket.on("connect", () => {
          socket.emit("join_ipl_match", { matchKey });
        });

        socket.on("scorecard_update", (data: any) => {
          if (mounted && data.matchKey === matchKey) {
            setScoreData(data);
          }
        });

        socket.on("micro_contest_open", (data: any) => {
          if (!mounted) return;
          console.log("Micro contest opened:", data);
          // Set new markets, opening betting window for the over
          setMicroContests(data.markets || []);
        });

        socket.on("micro_contest_settled", (data: any) => {
          if (!mounted) return;
          console.log("Micro contest settled:", data);
          // Show settlement feedback and remove these contests after a brief delay
          setMicroContests((current) => current.filter(c => c.id !== data.marketId));
        });

      } catch (error) {
        console.error("Failed to load match:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      if (socket) socket.disconnect();
    };
  }, [matchKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800/80 backdrop-blur-md shadow-lg border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <button onClick={() => router.back()} className="mr-4 p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div>
            <h1 className="text-lg font-bold">
              {matchInfo?.team_a.short_name} vs {matchInfo?.team_b.short_name}
            </h1>
            <p className="text-xs text-indigo-300 uppercase font-medium tracking-wider">
              {matchInfo?.status === "LIVE" ? (
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span> LIVE OVER</span>
              ) : matchInfo?.status}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* Scorecard Summary */}
        <div className="bg-slate-800 rounded-xl p-5 mb-6 shadow-xl border border-slate-700">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Live Score</h2>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-indigo-100">
            {scoreData?.summary || "Match about to start..."}
          </div>
          {scoreData?.lastBall && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <span className="text-sm text-slate-400">Last ball:</span>{" "}
              <span className="inline-block px-2 py-1 bg-slate-700 rounded text-sm text-white font-mono ml-2">
                {scoreData.lastBall.type}
              </span>
              <p className="text-sm text-slate-300 mt-2 italic flex">
                "{scoreData.lastBall.commentary}"
              </p>
            </div>
          )}
        </div>

        {/* Live Micro Contests Section */}
        <div className="mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl font-bold text-white">Live Micro-Contests</h2>
        </div>

        {microContests.length > 0 ? (
          <div className="space-y-4">
            {microContests.map((contest) => (
              <MicroContestCard key={contest.id} contest={contest} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col flex-1 items-center justify-center p-8 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
            <Zap className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400 text-center font-medium">No open micro-contests right now.</p>
            <p className="text-slate-500 text-sm text-center mt-2 max-w-sm">
              Markets open momentarily when the next over begins and close before the over completes.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

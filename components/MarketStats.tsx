"use client";

import { useEffect, useState } from "react";
import { Users, BarChart3, TrendingUp } from "lucide-react";

export default function MarketStats() {
    const [stats, setStats] = useState({
        activeUsers: 0,
        totalVolume: 0,
        liveTrades: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/activity');
                const data = await res.json();
                if (data.stats) {
                    setStats(data.stats);
                }
            } catch (e) {
                console.error("Stats fetch error:", e);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                    <Users className="h-3 w-3 text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active</span>
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                    {stats.activeUsers.toLocaleString()}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                    <BarChart3 className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Volume</span>
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                    ${(stats.totalVolume / 1000).toFixed(1)}k
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Trades</span>
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                    {stats.liveTrades}
                </div>
            </div>
        </div>
    );
}

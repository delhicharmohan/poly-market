"use client";

import { useEffect, useState } from "react";
import { User, TrendingUp } from "lucide-react";

const SIMULATED_ACTIVITIES = [
    { user: "AlexG", action: "placed $250 on YES", category: "Politics" },
    { user: "CryptoWhale", action: "wagered $1,200 on NO", category: "Crypto" },
    { user: "SarahM", action: "placed $50 on YES", category: "NFL" },
    { user: "TradeMaster", action: "wagered $500 on YES", category: "Finance" },
    { user: "CricketFan", action: "placed $100 on NO", category: "Cricket" },
    { user: "ElectionExpert", action: "wagered $2,500 on YES", category: "Election" },
    { user: "Baller23", action: "placed $150 on YES", category: "NBA" },
    { user: "InsightfulOne", action: "placed $300 on NO", category: "World" },
];

export default function ActivityTicker() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % SIMULATED_ACTIVITIES.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const current = SIMULATED_ACTIVITIES[index];

    return (
        <div className="bg-indigo-600/10 border-y border-indigo-500/20 py-2 overflow-hidden relative">
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-center sm:justify-start">
                <div className="flex items-center space-x-2 animate-fadeIn">
                    <TrendingUp className="h-3 w-3 text-indigo-500 animate-pulse" />
                    <span className="text-[10px] sm:text-xs font-semibold text-indigo-500 uppercase tracking-widest">LIVE ACTIVITY</span>
                    <span className="h-3 w-[1px] bg-indigo-500/30 mx-2 hidden sm:block"></span>
                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 text-xs truncate">
                        <span className="font-bold text-slate-900 dark:text-white">{current.user}</span>
                        <span>{current.action}</span>
                        <span className="hidden sm:inline text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">{current.category}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

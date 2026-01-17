"use client";

import { useEffect, useState, useMemo } from "react";
import { TrendingUp, Newspaper, Zap, Trophy } from "lucide-react";

interface Activity {
    type: string;
    text: string;
    timestamp: number;
}

export default function ActivityTicker() {
    const [activities, setActivities] = useState<Activity[]>([]);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const res = await fetch('/api/activity');
                const data = await res.json();
                if (data.activities && data.activities.length > 0) {
                    setActivities(data.activities);
                }
            } catch (e) {
                console.error("Ticker fetch error:", e);
            }
        };

        fetchActivity();
        const interval = setInterval(fetchActivity, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    // Fallback data if DB is empty or still loading
    const displayData = activities.length > 0 ? activities : [
        { type: "TRADE", text: "Welcome to Indimarket! Start trading now." },
        { type: "NEWS", text: "New markets added daily. Check the latest NFL odds." },
    ];

    const doubledData = useMemo(() => [...displayData, ...displayData], [displayData]);

    return (
        <div className="bg-slate-900 border-y border-slate-800 py-2.5 overflow-hidden relative group">
            <div className="flex items-center">
                {/* Fixed Label */}
                <div className="absolute left-0 top-0 bottom-0 px-4 bg-slate-900 z-10 flex items-center shadow-[10px_0_20px_rgba(15,23,42,0.9)] border-r border-slate-800">
                    <div className="flex items-center space-x-2">
                        <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </div>
                        <span className="text-[10px] font-black tracking-[0.2em] text-white uppercase italic">Live Feed</span>
                    </div>
                </div>

                {/* Scrolling Track */}
                <div className="flex animate-marquee whitespace-nowrap pl-[120px]">
                    {doubledData.map((item, idx) => (
                        <div key={idx} className="flex items-center mx-8 group/item">
                            {item.type === "TRADE" && <Zap className="h-3 w-3 text-indigo-400 mr-2 opacity-50" />}
                            {item.type === "WIN" && <Trophy className="h-3 w-3 text-emerald-400 mr-2 opacity-50" />}
                            {item.type === "NEWS" && <Newspaper className="h-3 w-3 text-amber-400 mr-2 opacity-50" />}

                            <span className={`text-[11px] font-bold uppercase tracking-tight mr-2 ${item.type === "WIN" ? "text-emerald-500" : "text-slate-500"
                                }`}>
                                {item.type}
                            </span>
                            <span className="text-xs font-medium text-slate-300 group-hover/item:text-white transition-colors">
                                {item.text}
                            </span>
                            <span className="mx-8 text-slate-800">•</span>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx global>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 60s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
}

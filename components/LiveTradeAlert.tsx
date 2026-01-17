"use client";

import { useEffect, useState } from "react";
import { Zap, X } from "lucide-react";

const SIMULATED_TRADES = [
    { name: "John Doe", market: "Bitcoin > $100k", state: "placed $100" },
    { name: "Whale_1", market: "NFL Super Bowl", state: "wagered $5,000" },
    { name: "Satoshi_fan", market: "Ethereum Merge", state: "placed $250" },
    { name: "MarketMaker", market: "S&P 500 Index", state: "wagered $1,500" },
    { name: "CryptoExpert", market: "Solana ATH", state: "placed $400" },
];

export default function LiveTradeAlert() {
    const [alert, setAlert] = useState<{ name: string; market: string; state: string } | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const triggerAlert = () => {
            const randomTrade = SIMULATED_TRADES[Math.floor(Math.random() * SIMULATED_TRADES.length)];
            setAlert(randomTrade);
            setIsVisible(true);

            // Hide after 5 seconds
            setTimeout(() => {
                setIsVisible(false);
            }, 5000);
        };

        // Trigger first alert after 5s, then every 15-25s
        const timer = setTimeout(triggerAlert, 5000);
        const interval = setInterval(triggerAlert, 20000 + Math.random() * 10000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, []);

    if (!alert) return null;

    return (
        <div
            className={`fixed bottom-24 left-4 z-50 max-w-[280px] transition-all duration-500 transform ${isVisible ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
                }`}
        >
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Zap className="h-5 w-5 text-indigo-500 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">New Trade</span>
                        <button onClick={() => setIsVisible(false)} className="text-slate-600 hover:text-white">
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                    <p className="text-xs text-white font-bold truncate mt-0.5">
                        {alert.name} <span className="text-slate-400 font-medium">{alert.state}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{alert.market}</p>
                </div>
            </div>
        </div>
    );
}

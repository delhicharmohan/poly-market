"use client";

import { Market } from "@/types";
import MarketCard from "./MarketCard";

interface MarketsByCategoryProps {
  markets: Market[];
  onPlaceWager: (market: Market, selection: "yes" | "no") => void;
}

export default function MarketsByCategory({ markets, onPlaceWager }: MarketsByCategoryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch">
      {markets.map((market, index) => (
        <div key={market.id} className="animate-fadeInUp" style={{ animationDelay: `${index * 50}ms` }}>
          <MarketCard
            market={market}
            onPlaceWager={(selection) => onPlaceWager(market, selection)}
          />
        </div>
      ))}
    </div>
  );
}


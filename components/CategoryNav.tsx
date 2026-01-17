"use client";

import { MarketCategory } from "@/types";

interface CategoryNavProps {
  selectedCategory: MarketCategory | null;
  onCategoryChange: (category: MarketCategory | null) => void;
}

const CATEGORIES: MarketCategory[] = ["Crypto", "Finance", "NFL", "NBA", "Cricket", "Football", "Politics", "Election"];

export default function CategoryNav({
  selectedCategory,
  onCategoryChange,
}: CategoryNavProps) {
  return (
    <div className="sticky top-[56px] sm:top-[64px] z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-5 mb-4 -mx-3 sm:-mx-4 lg:-mx-8 px-3 sm:px-4 lg:px-8 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => onCategoryChange(null)}
            className={`flex-shrink-0 text-[11px] font-black uppercase tracking-widest transition-all touch-manipulation whitespace-nowrap ${selectedCategory === null
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
          >
            All Markets
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`flex-shrink-0 text-[11px] font-black uppercase tracking-widest transition-all touch-manipulation whitespace-nowrap ${selectedCategory === category
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


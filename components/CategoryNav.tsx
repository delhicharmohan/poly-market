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
    <div className="sticky top-[56px] sm:top-[64px] z-40 bg-slate-50 dark:bg-slate-900 pt-3 pb-3 mb-4 -mx-3 sm:-mx-4 lg:-mx-8 px-3 sm:px-4 lg:px-8 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-6 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => onCategoryChange(null)}
          className={`flex-shrink-0 text-sm font-medium transition-colors touch-manipulation whitespace-nowrap ${
            selectedCategory === null
              ? "text-white"
              : "text-slate-400 dark:text-slate-500 hover:text-slate-300 dark:hover:text-slate-400"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`flex-shrink-0 text-sm font-medium transition-colors touch-manipulation whitespace-nowrap ${
              selectedCategory === category
                ? "text-white"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-300 dark:hover:text-slate-400"
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


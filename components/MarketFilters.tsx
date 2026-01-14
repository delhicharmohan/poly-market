"use client";

import { useState } from "react";
import { MarketCategory, MarketTerm } from "@/types";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";

interface MarketFiltersProps {
  selectedCategory: MarketCategory | null;
  selectedTerm: MarketTerm | null;
  onCategoryChange: (category: MarketCategory | null) => void;
  onTermChange: (term: MarketTerm | null) => void;
}

const CATEGORIES: MarketCategory[] = ["Crypto", "Finance", "NFL", "NBA", "Cricket", "Football", "Politics", "Election"];
const TERMS: MarketTerm[] = ["Ultra Short", "Short", "Long"];

export default function MarketFilters({
  selectedCategory,
  selectedTerm,
  onCategoryChange,
  onTermChange,
}: MarketFiltersProps) {
  const hasFilters = selectedCategory !== null || selectedTerm !== null;
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-4 sm:mb-6 animate-fadeInUp">
      {/* Header - Always visible on mobile */}
      <div 
        className="flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Filters
            {hasFilters && (
              <span className="ml-2 text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400">
                ({[selectedCategory, selectedTerm].filter(Boolean).length} active)
              </span>
            )}
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          {hasFilters && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCategoryChange(null);
                onTermChange(null);
              }}
              className="hidden sm:flex items-center space-x-1 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-all duration-200 touch-manipulation"
            >
              <X className="h-3 w-3" />
              <span>Clear All</span>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="sm:hidden text-slate-600 dark:text-slate-400"
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Category
            </label>
            {/* Horizontal scroll on mobile */}
            <div className="flex sm:flex-wrap gap-2 overflow-x-auto pb-2 -mx-1 px-1 sm:mx-0 sm:px-0 sm:pb-0 scrollbar-hide">
              <button
                onClick={() => onCategoryChange(null)}
                className={`flex-shrink-0 px-4 py-2.5 text-sm rounded-lg font-medium transition-all duration-200 touch-manipulation min-w-[60px] ${
                  selectedCategory === null
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-600"
                }`}
              >
                All
              </button>
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => onCategoryChange(category)}
                  className={`flex-shrink-0 px-4 py-2.5 text-sm rounded-lg font-medium transition-all duration-200 touch-manipulation ${
                    selectedCategory === category
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-600"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Term Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Duration
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onTermChange(null)}
                className={`px-4 py-2.5 text-sm rounded-lg font-medium transition-all duration-200 touch-manipulation ${
                  selectedTerm === null
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-600"
                }`}
              >
                All
              </button>
              {TERMS.map((term) => (
                <button
                  key={term}
                  onClick={() => onTermChange(term)}
                  className={`px-4 py-2.5 text-sm rounded-lg font-medium transition-all duration-200 touch-manipulation ${
                    selectedTerm === term
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-600"
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Clear All Button */}
          {hasFilters && (
            <div className="sm:hidden pt-2">
              <button
                onClick={() => {
                  onCategoryChange(null);
                  onTermChange(null);
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-all duration-200 touch-manipulation"
              >
                <X className="h-4 w-4" />
                <span>Clear All Filters</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


"use client";

import { MarketCategory, MarketTerm } from "@/types";
import FilterDropdown from "./FilterDropdown";
import { TrendingUp, Flame, Droplets, Star, Clock, Trophy } from "lucide-react";

interface FilterBarProps {
  selectedCategory: MarketCategory | null;
  selectedTerm: MarketTerm | null;
  onCategoryChange: (category: MarketCategory | null) => void;
  onTermChange: (term: MarketTerm | null) => void;
}

const CATEGORIES: MarketCategory[] = ["Crypto", "Finance", "NFL", "NBA", "Cricket", "Football", "Politics", "Election"];
const TERMS: MarketTerm[] = ["Ultra Short", "Short", "Long"];

// Map terms to frequency labels
const termToFrequency: Record<string, string> = {
  "Ultra Short": "Daily",
  "Short": "Weekly",
  "Long": "Monthly",
};

const frequencyToTerm: Record<string, MarketTerm | null> = {
  "Daily": "Ultra Short",
  "Weekly": "Short",
  "Monthly": "Long",
  "All": null,
};

export default function FilterBar({
  selectedCategory,
  selectedTerm,
  onCategoryChange,
  onTermChange,
}: FilterBarProps) {
  const sortOptions = [
    { value: null, label: "All Categories", icon: <TrendingUp className="h-4 w-4" /> },
    { value: "Crypto", label: "Crypto", icon: <Flame className="h-4 w-4" /> },
    { value: "Finance", label: "Finance", icon: <Droplets className="h-4 w-4" /> },
    { value: "NFL", label: "NFL", icon: <Star className="h-4 w-4" /> },
    { value: "NBA", label: "NBA", icon: <Clock className="h-4 w-4" /> },
    { value: "Cricket", label: "Cricket", icon: <Trophy className="h-4 w-4" /> },
    { value: "Football", label: "Football", icon: <Trophy className="h-4 w-4" /> },
    { value: "Politics", label: "Politics", icon: <Trophy className="h-4 w-4" /> },
    { value: "Election", label: "Election", icon: <Trophy className="h-4 w-4" /> },
  ];

  const frequencyOptions = [
    { value: null, label: "All" },
    { value: "Ultra Short", label: "Daily" },
    { value: "Short", label: "Weekly" },
    { value: "Long", label: "Monthly" },
  ];

  const getSortLabel = () => {
    if (!selectedCategory) return "All Categories";
    return selectedCategory;
  };

  const getFrequencyLabel = () => {
    if (!selectedTerm) return "All";
    return termToFrequency[selectedTerm] || "All";
  };

  const handleSortSelect = (value: string | null) => {
    onCategoryChange(value as MarketCategory | null);
  };

  const handleFrequencySelect = (value: string | null) => {
    if (value === null) {
      onTermChange(null);
    } else {
      onTermChange(value as MarketTerm);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <FilterDropdown
        label="Sort by"
        options={sortOptions}
        selectedValue={selectedCategory}
        onSelect={handleSortSelect}
        position="left"
      />
      <FilterDropdown
        label="Frequency"
        options={frequencyOptions}
        selectedValue={selectedTerm}
        onSelect={handleFrequencySelect}
        position="left"
      />
    </div>
  );
}


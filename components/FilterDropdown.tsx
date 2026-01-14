"use client";

import { useState, useRef, useEffect } from "react";
import { MarketCategory, MarketTerm } from "@/types";
import { ChevronDown, TrendingUp, Flame, Droplets, Star, Clock, Trophy } from "lucide-react";

interface FilterDropdownProps {
  label: string;
  options: Array<{ value: string | null; label: string; icon?: React.ReactNode }>;
  selectedValue: string | null;
  onSelect: (value: string | null) => void;
  position?: "left" | "right";
}

export default function FilterDropdown({
  label,
  options,
  selectedValue,
  onSelect,
  position = "left",
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === selectedValue) || options[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2.5 bg-slate-700 dark:bg-slate-800 hover:bg-slate-600 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm touch-manipulation"
      >
        <span className="text-slate-400 dark:text-slate-500">{label}:</span>
        <span className="text-white font-medium">{selectedOption.label}</span>
        <ChevronDown className={`h-4 w-4 text-white transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-2 z-50 bg-slate-800 dark:bg-slate-900 rounded-lg shadow-xl border border-slate-700 dark:border-slate-700 min-w-[200px] ${
            position === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="py-2">
            {options.map((option) => (
              <button
                key={option.value || "all"}
                onClick={() => {
                  onSelect(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors touch-manipulation ${
                  selectedValue === option.value
                    ? "bg-indigo-600/20 text-white"
                    : "text-slate-300 dark:text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-700"
                }`}
              >
                <div className="flex items-center space-x-3">
                  {option.icon && <span className="text-slate-400">{option.icon}</span>}
                  <span>{option.label}</span>
                </div>
                {selectedValue === option.value && (
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



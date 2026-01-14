"use client";

export default function IndimarketLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex items-baseline">
        <span className="text-xl font-semibold text-white">
          Indimarket
        </span>
      </div>
    </div>
  );
}


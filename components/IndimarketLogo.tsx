"use client";

export default function IndimarketLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon */}
      <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer white circle with glow effect */}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Outer white circle border */}
          <circle
            cx="50"
            cy="50"
            r="47"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            filter="url(#glow)"
          />
          
          {/* Inner purple/lavender circle background */}
          <circle
            cx="50"
            cy="50"
            r="43"
            fill="#a78bfa"
            className="opacity-95"
          />
          
          {/* Upward-pointing triangle (top element) */}
          <path
            d="M 50 22 L 38 38 L 62 38 Z"
            fill="white"
            filter="url(#glow)"
          />
          
          {/* Bow-tie/hourglass shape (bottom element - two horizontal triangles) */}
          <path
            d="M 32 52 L 50 68 L 50 58 Z"
            fill="white"
            filter="url(#glow)"
          />
          <path
            d="M 68 52 L 50 68 L 50 58 Z"
            fill="white"
            filter="url(#glow)"
          />
          
          {/* Center circle where triangles meet */}
          <circle
            cx="50"
            cy="63"
            r="3"
            fill="#c4b5fd"
            className="opacity-95"
          />
        </svg>
      </div>
      
      {/* Logo Text */}
      <div className="flex items-baseline">
        <span className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
          IndiMarket
        </span>
      </div>
    </div>
  );
}


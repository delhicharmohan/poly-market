"use client";

import { useState, useEffect } from "react";
import { wallet } from "@/lib/wallet";
import { Wallet } from "lucide-react";

interface WalletButtonProps {
  onClick: () => void;
}

export default function WalletButton({ onClick }: WalletButtonProps) {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const updateBalance = () => {
      wallet.getBalance().then(setBalance);
    };

    updateBalance();
    // Update balance every second to catch external changes
    const interval = setInterval(updateBalance, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md touch-manipulation"
    >
      <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
      <span className="hidden xs:inline font-semibold">${balance.toFixed(2)}</span>
    </button>
  );
}


"use client";

import { useState, useEffect } from "react";
import { transactions, Transaction } from "@/lib/transactions";
import { TrendingUp, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";

type FilterType = "all" | "active" | "settled" | "deposit" | "withdraw";

export default function TransactionsList() {
  const [transactionList, setTransactionList] = useState<Transaction[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    // Load transactions on mount
    const loadTransactions = async () => {
      const txs = await transactions.getAllTransactions();
      setTransactionList(txs);
    };

    loadTransactions();
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const filteredTransactions = transactionList.filter((tx) => {
    if (filter === "all") return true;
    if (filter === "settled") {
      // Show settled wagers and win transactions (which are from settled markets)
      return tx.marketStatus === "SETTLED" || tx.type === "win";
    }
    if (filter === "active") {
      // Show only active wagers (not settled), exclude wallet transactions
      return tx.marketStatus !== "SETTLED" && tx.marketStatus !== undefined && tx.type === "wager";
    }
    if (filter === "deposit") {
      // Show only deposit transactions
      return tx.type === "deposit";
    }
    if (filter === "withdraw") {
      // Show only withdrawal transactions
      return tx.type === "withdraw";
    }
    return true;
  });

  const getStatusIcon = (tx: Transaction) => {
    if (tx.type === "deposit") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (tx.type === "withdraw") return <XCircle className="h-4 w-4 text-orange-500" />;
    if (tx.type === "win") return <CheckCircle className="h-4 w-4 text-green-500" />;
    
    // For wager transactions
    if (tx.marketStatus === "SETTLED") {
      if (tx.status === "WON") return <CheckCircle className="h-4 w-4 text-green-500" />;
      if (tx.status === "LOST") return <XCircle className="h-4 w-4 text-red-500" />;
      return <CheckCircle className="h-4 w-4 text-slate-500" />;
    }
    if (tx.marketStatus === "CLOSED") {
      return <XCircle className="h-4 w-4 text-orange-500" />;
    }
    return <Clock className="h-4 w-4 text-blue-500" />;
  };

  const getStatusText = (tx: Transaction) => {
    if (tx.type === "deposit") return "Deposit";
    if (tx.type === "withdraw") return "Withdrawal";
    if (tx.type === "win") return "Won";
    
    // For wager transactions
    if (tx.marketStatus === "SETTLED") {
      if (tx.status === "WON") return "Won";
      if (tx.status === "LOST") return "Lost";
      return "Settled";
    }
    if (tx.marketStatus === "CLOSED") return "Closed";
    return "Active";
  };

  const getTransactionTitle = (tx: Transaction) => {
    if (tx.type === "deposit") return "Deposit";
    if (tx.type === "withdraw") return "Withdrawal";
    if (tx.type === "win") return tx.marketTitle || "Winnings";
    return tx.marketTitle || "Unknown Market";
  };

  const getTransactionAmount = (tx: Transaction) => {
    if (tx.type === "deposit" || tx.type === "win") {
      return Math.abs(tx.amount);
    }
    if (tx.type === "withdraw") {
      return Math.abs(tx.amount);
    }
    // For wagers, show stake
    return tx.stake || 0;
  };

  if (transactionList.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
        <div className="text-slate-400 dark:text-slate-500 mb-2">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          No transactions yet. Place your first bet to see it here!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex items-center overflow-x-auto">
        <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg whitespace-nowrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              filter === "all"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              filter === "active"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter("settled")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              filter === "settled"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Settled
          </button>
          <button
            onClick={() => setFilter("deposit")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              filter === "deposit"
                ? "bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Deposits
          </button>
          <button
            onClick={() => setFilter("withdraw")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              filter === "withdraw"
                ? "bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Withdrawals
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.map((tx) => {
          const isExpanded = expandedIds.has(tx.id);
          const isSettled = tx.marketStatus === "SETTLED";
          const isWon = isSettled && tx.status === "WON";
          const isWalletTx = tx.type === "deposit" || tx.type === "withdraw" || tx.type === "win";
          
          return (
            <div
              key={tx.id}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden transition-all"
            >
              {/* Collapsed Header - Always Visible */}
              <button
                onClick={() => toggleExpand(tx.id)}
                className="w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {getTransactionTitle(tx)}
                      </h3>
                      {!isWalletTx && tx.selection && (
                        <div
                          className={`px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${
                            tx.selection === "yes"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                          }`}
                        >
                          {tx.selection.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {getStatusIcon(tx)}
                      <span>{getStatusText(tx)}</span>
                      <span>•</span>
                      <span>{formatDate(tx.timestamp)}</span>
                      {!isWalletTx && (
                        <>
                          <span>•</span>
                          <span>${getTransactionAmount(tx).toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      {isWalletTx ? (
                        <>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                            Amount
                          </div>
                          <div className={`text-sm font-bold ${
                            tx.type === "deposit" || tx.type === "win"
                              ? "text-green-600 dark:text-green-400"
                              : "text-orange-600 dark:text-orange-400"
                          }`}>
                            {tx.type === "deposit" || tx.type === "win" ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                            {isSettled && isWon && tx.payout !== undefined
                              ? "Winning"
                              : "Potential Win"}
                          </div>
                          <div className={`text-sm font-bold ${
                            isSettled && isWon
                              ? "text-green-600 dark:text-green-400"
                              : "text-indigo-600 dark:text-indigo-400"
                          }`}>
                            ${isSettled && isWon && tx.payout !== undefined
                              ? tx.payout.toFixed(2)
                              : (tx.potentialWin || 0).toFixed(2)}
                          </div>
                        </>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Details - Shown when expanded */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  <div className="pt-4 space-y-3">
                    {isWalletTx ? (
                      // Wallet transaction details
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Type</div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                            {tx.type}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Amount</div>
                          <div className={`text-sm font-semibold ${
                            tx.type === "deposit" || tx.type === "win"
                              ? "text-green-600 dark:text-green-400"
                              : "text-orange-600 dark:text-orange-400"
                          }`}>
                            {tx.type === "deposit" || tx.type === "win" ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}
                          </div>
                        </div>
                        {tx.balanceAfter !== undefined && (
                          <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Balance After</div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              ${tx.balanceAfter.toFixed(2)}
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</div>
                          <div className="flex items-center gap-1.5">
                            {getStatusIcon(tx)}
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {getStatusText(tx)}
                            </span>
                          </div>
                        </div>
                        {tx.description && (
                          <div className="col-span-2">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Description</div>
                            <div className="text-sm text-slate-900 dark:text-white">
                              {tx.description}
                            </div>
                          </div>
                        )}
                        {tx.wagerId && (
                          <div className="col-span-2">
                            <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                              Wager ID: {tx.wagerId}
                            </div>
                            {tx.marketId && (
                              <div className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">
                                Market ID: {tx.marketId}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Wager transaction details
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Stake</div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            ${(tx.stake || 0).toFixed(2)}
                          </div>
                        </div>
                        {tx.odds && tx.selection && (
                          <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Odds</div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {tx.odds[tx.selection].toFixed(2)}x
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                            {isSettled && isWon && tx.payout !== undefined
                              ? "Winning"
                              : "Potential Win"}
                          </div>
                          <div className={`text-sm font-semibold ${
                            isSettled && isWon
                              ? "text-green-600 dark:text-green-400"
                              : "text-indigo-600 dark:text-indigo-400"
                          }`}>
                            ${isSettled && isWon && tx.payout !== undefined
                              ? tx.payout.toFixed(2)
                              : (tx.potentialWin || 0).toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</div>
                          <div className="flex items-center gap-1.5">
                            {getStatusIcon(tx)}
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {getStatusText(tx)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {!isWalletTx && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                        {tx.wagerId && (
                          <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                            Wager ID: {tx.wagerId}
                          </div>
                        )}
                        {tx.marketId && (
                          <div className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">
                            Market ID: {tx.marketId}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import { transactions, Transaction } from "@/lib/transactions";
import { Wallet, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft } from "lucide-react";

type FilterType = "all" | "active" | "settled" | "deposit" | "withdraw";

export default function TransactionsList() {
  const [transactionList, setTransactionList] = useState<Transaction[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
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

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
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
    if (filter === "settled") return tx.marketStatus === "SETTLED" || tx.type === "win";
    const isWager = tx.type === "wager" || (tx.type === "withdraw" && !!tx.wagerId);
    if (filter === "active") return tx.marketStatus !== "SETTLED" && isWager;
    if (filter === "deposit") return tx.type === "deposit";
    if (filter === "withdraw") return tx.type === "withdraw" && !tx.wagerId;
    return true;
  });

  const getTransactionLabel = (tx: Transaction) => {
    switch (tx.type) {
      case "deposit": return "Deposit";
      case "withdraw": return tx.wagerId ? "Wager" : "Withdrawal";
      case "win": return "Win Payout";
      case "wager": return "Wager";
      default: return "Transaction";
    }
  };

  const getStatusText = (tx: Transaction) => {
    if (tx.type === "deposit" || tx.type === "win" || (tx.type === "wager" && tx.status === "WON")) {
      return "Completed";
    }
    if (tx.status === "LOST") return "Settled";
    return "Pending";
  };

  if (transactionList.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <Wallet className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Transaction history is empty</h3>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header & Minimal Filters */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {(["all", "active", "settled", "deposit", "withdraw"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${filter === f
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                  : "bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Professional Table-like List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {filteredTransactions.map((tx) => {
          const isExpanded = expandedIds.has(tx.id);
          const amountValue = tx.type === "wager" ? tx.stake : Math.abs(tx.amount);
          const isCredit = tx.type === "deposit" || tx.type === "win";

          return (
            <div key={tx.id} className="group">
              <button
                onClick={() => toggleExpand(tx.id)}
                className="w-full flex items-start p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors text-left"
              >
                {/* Minimal Indicator Line */}
                <div className={`w-1 self-stretch rounded-full mr-4 ${isCredit ? "bg-emerald-500/50" : "bg-slate-300 dark:bg-slate-700"
                  }`} />

                {/* Main Content Area */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {getTransactionLabel(tx)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {formatDate(tx.timestamp)}
                    </span>
                  </div>

                  {/* Market Question - No truncation */}
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-200 leading-snug">
                    {tx.marketTitle || tx.description || "System Transaction"}
                  </h4>
                </div>

                {/* Amount and Compact Status */}
                <div className="flex flex-col items-end flex-shrink-0 pt-0.5">
                  <span className={`text-sm font-bold tabular-nums ${isCredit ? "text-emerald-600 dark:text-emerald-500" : "text-slate-900 dark:text-white"
                    }`}>
                    {isCredit ? "+" : "-"}${amountValue?.toFixed(2)}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[10px] font-medium ${getStatusText(tx) === "Pending" ? "text-amber-600" : "text-slate-400 dark:text-slate-500"
                      }`}>
                      {getStatusText(tx)}
                    </span>
                    {isExpanded ? <ChevronUp className="h-3 w-3 text-slate-300" /> : <ChevronDown className="h-3 w-3 text-slate-300" />}
                  </div>
                </div>
              </button>

              {/* Expansion Details */}
              {isExpanded && (
                <div className="px-9 pb-4 bg-slate-50/30 dark:bg-slate-800/10">
                  <div className="grid grid-cols-2 gap-y-3 pt-2 text-[11px]">
                    <div className="space-y-0.5">
                      <span className="block text-slate-400 uppercase font-bold tracking-tighter">Reference ID</span>
                      <code className="text-slate-600 dark:text-slate-400 font-mono">{tx.id.split('_').pop()}</code>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-slate-400 uppercase font-bold tracking-tighter">Full Date</span>
                      <span className="text-slate-600 dark:text-slate-400">{new Date(tx.timestamp).toLocaleString()}</span>
                    </div>
                    {tx.selection && (
                      <div className="space-y-0.5">
                        <span className="block text-slate-400 uppercase font-bold tracking-tighter">Selected Outcome</span>
                        <span className={`font-bold ${tx.selection === 'yes' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.selection.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <span className="block text-slate-400 uppercase font-bold tracking-tighter">Balance After</span>
                      <span className="text-slate-900 dark:text-white font-semibold">${tx.balanceAfter?.toFixed(2) || "---"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Subtle Footer */}
      <div className="p-6 text-center">
        <div className="h-px bg-slate-100 dark:bg-slate-800 w-12 mx-auto mb-4" />
        <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">
          End of Activity
        </p>
      </div>
    </div>
  );
}

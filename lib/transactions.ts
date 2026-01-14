import { WagerResponse } from "@/types";
import { Market } from "@/types";
import { dbClient } from "./db-client";

export interface Transaction {
  id: string;
  type: "wager" | "deposit" | "withdraw" | "win"; // Transaction type
  wagerId?: string; // Only for wager/win transactions
  marketId?: string; // Only for wager transactions
  marketTitle?: string; // Only for wager transactions
  selection?: "yes" | "no"; // Only for wager transactions
  stake?: number; // Only for wager transactions
  odds?: {
    yes: number;
    no: number;
  }; // Only for wager transactions
  potentialWin?: number; // Only for wager transactions
  status?: string; // Only for wager transactions (PENDING, WON, LOST)
  timestamp: number;
  marketStatus?: "OPEN" | "CLOSED" | "SETTLED"; // Only for wager transactions
  payout?: number; // Actual payout amount when market is settled and user won (for wager/win)
  amount: number; // For all transaction types (positive for deposit/win, negative for withdraw/wager)
  description?: string; // Transaction description
  balanceAfter?: number; // Balance after this transaction
}

class Transactions {
  private readonly STORAGE_KEY = "indimarket_transactions";
  private useDatabase = true; // Toggle to use database or localStorage

  private getTransactions(): Transaction[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error("Error reading transactions:", error);
      return [];
    }
  }

  private saveTransactions(transactions: Transaction[]): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error("Error saving transactions:", error);
    }
  }

  async addTransaction(
    wagerResult: WagerResponse,
    market: Market,
    userEmail?: string
  ): Promise<void> {
    const potentialWin = wagerResult.stake * wagerResult.odds[wagerResult.selection];

    const transaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "wager",
      wagerId: wagerResult.wagerId,
      marketId: wagerResult.marketId,
      marketTitle: market.title,
      selection: wagerResult.selection,
      stake: wagerResult.stake,
      amount: -wagerResult.stake, // Negative for wager
      odds: wagerResult.odds,
      potentialWin,
      status: wagerResult.status,
      timestamp: Date.now(),
      marketStatus: market.status,
    };

    // Try to save to database first
    if (this.useDatabase) {
      try {
        const saved = await dbClient.saveTransaction({
          wagerId: transaction.wagerId!,
          marketId: transaction.marketId!,
          marketTitle: transaction.marketTitle!,
          selection: transaction.selection!,
          stake: transaction.stake!,
          odds: transaction.odds!,
          potentialWin: transaction.potentialWin!,
          status: transaction.status!,
          marketStatus: transaction.marketStatus!,
          email: userEmail,
        });

        if (saved) {
          // Also save to localStorage as backup
          const transactions = this.getTransactions();
          transactions.unshift(transaction);
          this.saveTransactions(transactions);
          return;
        }
      } catch (error) {
        console.warn("Failed to save to database, falling back to localStorage:", error);
      }
    }

    // Fallback to localStorage
    const transactions = this.getTransactions();
    transactions.unshift(transaction);
    this.saveTransactions(transactions);
  }

  async getAllTransactions(): Promise<Transaction[]> {
    // Try to get from database first
    if (this.useDatabase) {
      try {
        const dbTransactions = await dbClient.getTransactions();
        if (dbTransactions.length > 0) {
          // Merge with localStorage (database takes precedence)
          const localTransactions = this.getTransactions();
          const merged = [...dbTransactions, ...localTransactions.filter(
            (local) => !dbTransactions.find((db) => db.wagerId === local.wagerId)
          )];
          return merged.sort((a, b) => b.timestamp - a.timestamp);
        }
      } catch (error) {
        console.warn("Failed to fetch from database, using localStorage:", error);
      }
    }

    // Fallback to localStorage
    return this.getTransactions();
  }

  getTransactionsByMarket(marketId: string): Transaction[] {
    return this.getTransactions().filter((tx) => tx.marketId === marketId);
  }

  clearTransactions(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const transactions = new Transactions();


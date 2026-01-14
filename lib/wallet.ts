import { dbClient } from "./db-client";

class Wallet {
  private balance: number = 0;
  private readonly STORAGE_KEY = "indimarket_wallet_balance";
  private useDatabase = true; // Toggle to use database or localStorage
  private balanceLoaded = false;

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.balance = parseFloat(stored) || 0;
      }
    }
  }

  async getBalance(forceRefresh: boolean = false): Promise<number> {
    // Always try to load from database if using database
    if (this.useDatabase && (!this.balanceLoaded || forceRefresh)) {
      try {
        const dbBalance = await dbClient.getWalletBalance();
        this.balance = dbBalance;
        this.balanceLoaded = true;
        // Sync to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(this.STORAGE_KEY, this.balance.toString());
        }
        return this.balance;
      } catch (error) {
        console.warn("Failed to load balance from database, using localStorage:", error);
      }
    }
    
    return this.balance;
  }

  // Synchronous getter for backward compatibility (uses cached value)
  getBalanceSync(): number {
    return this.balance;
  }

  async deposit(amount: number): Promise<boolean> {
    if (amount <= 0 || isNaN(amount)) {
      return false;
    }

    // Try to save to database first
    if (this.useDatabase) {
      try {
        const result = await dbClient.updateWallet("deposit", amount, `Deposit of $${amount.toFixed(2)}`);
        this.balance = result.balance;
        this.saveBalance();
        return true;
      } catch (error) {
        console.warn("Failed to deposit to database, using localStorage:", error);
      }
    }

    // Fallback to localStorage
    this.balance += amount;
    this.saveBalance();
    return true;
  }

  async withdraw(amount: number): Promise<boolean> {
    if (amount <= 0 || isNaN(amount)) {
      return false;
    }

    // Always refresh balance from database before withdrawal to ensure accuracy
    const currentBalance = await this.getBalance(true);
    if (amount > currentBalance) {
      return false;
    }

    // Try to save to database first
    if (this.useDatabase) {
      try {
        const result = await dbClient.updateWallet("withdraw", amount, `Withdrawal of $${amount.toFixed(2)}`);
        this.balance = result.balance;
        this.balanceLoaded = true; // Mark as loaded after successful update
        this.saveBalance();
        return true;
      } catch (error: any) {
        // If it's an insufficient balance error from the server, don't fall back to localStorage
        if (error?.message?.includes("Insufficient balance") || error?.response?.data?.message?.includes("Insufficient balance")) {
          throw error; // Re-throw to let the caller handle it
        }
        console.warn("Failed to withdraw from database, using localStorage:", error);
      }
    }

    // Fallback to localStorage only if database is not being used
    if (!this.useDatabase) {
      this.balance -= amount;
      this.saveBalance();
      return true;
    }
    
    // If database is enabled but failed, return false
    return false;
  }

  async canWithdraw(amount: number): Promise<boolean> {
    const balance = await this.getBalance(true); // Always refresh from database
    return amount > 0 && amount <= balance;
  }

  private saveBalance() {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.STORAGE_KEY, this.balance.toString());
    }
  }

  // Reset wallet (for testing)
  reset() {
    this.balance = 0;
    this.balanceLoaded = false;
    this.saveBalance();
  }
}

export const wallet = new Wallet();


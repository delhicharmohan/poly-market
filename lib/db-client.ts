import axios from "axios";
import { Transaction } from "./transactions";

// Client-side API utilities for database operations

export class DatabaseClient {
  private getUserId(): string | null {
    // Get Firebase user ID from localStorage or context
    // For now, we'll use a simple approach - in production, get from auth context
    if (typeof window === "undefined") return null;
    
    // Try to get from a stored session
    const userId = sessionStorage.getItem("firebase_uid");
    return userId;
  }

  private getHeaders() {
    const userId = this.getUserId();
    return {
      "Content-Type": "application/json",
      ...(userId ? { "X-User-ID": userId } : {}),
    };
  }

  async syncUser(firebaseUid: string, email: string, displayName?: string) {
    try {
      await axios.post("/api/users/sync", {
        firebaseUid,
        email,
        displayName,
      });
      // Store user ID for future requests
      if (typeof window !== "undefined") {
        sessionStorage.setItem("firebase_uid", firebaseUid);
      }
    } catch (error) {
      console.error("Failed to sync user:", error);
    }
  }

  async getTransactions(): Promise<Transaction[]> {
    try {
      const response = await axios.get("/api/transactions", {
        headers: this.getHeaders(),
      });
      return response.data.transactions || [];
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      return [];
    }
  }

  async saveTransaction(transaction: {
    wagerId: string;
    marketId: string;
    marketTitle: string;
    selection: "yes" | "no";
    stake: number;
    odds: { yes: number; no: number };
    potentialWin: number;
    status: string;
    marketStatus?: string;
    email?: string;
  }) {
    try {
      await axios.post(
        "/api/transactions",
        {
          ...transaction,
          email: transaction.email || undefined,
        },
        {
          headers: this.getHeaders(),
        }
      );
      return true;
    } catch (error) {
      console.error("Failed to save transaction:", error);
      return false;
    }
  }

  async getWalletBalance(): Promise<number> {
    try {
      const response = await axios.get("/api/wallet", {
        headers: this.getHeaders(),
      });
      return response.data.balance || 0;
    } catch (error) {
      console.error("Failed to fetch wallet balance:", error);
      return 0;
    }
  }

  async updateWallet(type: "deposit" | "withdraw", amount: number, description?: string) {
    try {
      const response = await axios.post(
        "/api/wallet",
        {
          type,
          amount,
          description,
        },
        {
          headers: this.getHeaders(),
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Failed to update wallet:", error);
      throw new Error(error.response?.data?.message || "Failed to update wallet");
    }
  }

  /** Admin only. Returns all sales with user info. */
  async getAdminSales(): Promise<
    {
      id: string;
      invoiceNumber: string;
      paintingId: string;
      paintingName: string;
      paintingImageUrl: string | null;
      amountInr: number;
      emailSentAt: string | null;
      createdAt: string;
      userEmail?: string;
      userDisplayName?: string | null;
    }[]
  > {
    try {
      const response = await axios.get("/api/admin/sales", {
        headers: this.getHeaders(),
      });
      return response.data.sales || [];
    } catch (error) {
      console.error("Failed to fetch admin sales:", error);
      return [];
    }
  }

  async getSales(): Promise<
    {
      id: string;
      invoiceNumber: string;
      paintingId: string;
      paintingName: string;
      paintingImageUrl: string | null;
      amountInr: number;
      emailSentAt: string | null;
      createdAt: string;
    }[]
  > {
    try {
      const response = await axios.get("/api/sales", {
        headers: this.getHeaders(),
      });
      return response.data.sales || [];
    } catch (error) {
      console.error("Failed to fetch sales:", error);
      return [];
    }
  }

  /** Admin only. Returns { isAdmin: boolean }. */
  async getAdminMe(): Promise<{ isAdmin: boolean }> {
    try {
      const response = await axios.get("/api/admin/me", {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      return { isAdmin: false };
    }
  }

  /** Admin only. Returns all users with balance. */
  async getAdminUsers(): Promise<
    {
      id: string;
      firebaseUid: string;
      email: string;
      displayName: string | null;
      balance: number;
      createdAt: string;
    }[]
  > {
    try {
      const response = await axios.get("/api/admin/users", {
        headers: this.getHeaders(),
      });
      return response.data.users || [];
    } catch (error) {
      console.error("Failed to fetch admin users:", error);
      return [];
    }
  }

  /** Admin only. Returns all transactions with user info. */
  async getAdminTransactions(): Promise<
    {
      id: string;
      userEmail: string;
      userDisplayName: string | null;
      type: string;
      amount: number;
      balanceAfter: number;
      description: string | null;
      timestamp: number;
      wagerId?: string;
      marketId?: string;
      marketTitle?: string;
      selection?: string;
      stake?: number;
      odds?: { yes: number; no: number };
      potentialWin?: number;
      status?: string;
      marketStatus?: string;
    }[]
  > {
    try {
      const response = await axios.get("/api/admin/transactions", {
        headers: this.getHeaders(),
      });
      return response.data.transactions || [];
    } catch (error) {
      console.error("Failed to fetch admin transactions:", error);
      return [];
    }
  }

  async purchasePainting(params: {
    paintingId: string;
    paintingName: string;
    paintingImageUrl?: string;
    amountInr: number;
  }) {
    const response = await axios.post(
      "/api/sales",
      params,
      { headers: this.getHeaders() }
    );
    return response.data;
  }
}

export const dbClient = new DatabaseClient();



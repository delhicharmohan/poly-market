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
      isBlocked: boolean;
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

  /** Admin only. Add a new user manually. */
  async addUser(email: string, displayName?: string): Promise<{ success: boolean; user?: any; message?: string }> {
    try {
      const response = await axios.post(
        "/api/admin/users",
        { email, displayName },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to add user";
      return { success: false, message: msg };
    }
  }

  /** Admin only. Delete a user by ID. */
  async deleteUser(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await axios.delete(`/api/admin/users/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to delete user";
      return { success: false, message: msg };
    }
  }

  /** Admin only. Block or unblock a user. */
  async blockUser(id: string, blocked: boolean): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await axios.patch(
        `/api/admin/users/${id}/block`,
        { blocked },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to update block status";
      return { success: false, message: msg };
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

  /** Initiate payment via xpaysafe; returns URLs for desktop (paymentLink) and mobile (upiLink). */
  async initiatePayment(params: {
    paintingId: string;
    paintingName: string;
    paintingImageUrl?: string;
    amountInr: number;
  }): Promise<{
    redirectUrl: string;
    paymentLink?: string;
    upiLink?: string;
    transactionId?: string;
    orderId: string;
  }> {
    const response = await axios.post(
      "/api/payments/initiate",
      params,
      { headers: this.getHeaders() }
    );
    const data = response.data;
    if (!data.redirectUrl && !data.paymentLink && !data.upiLink) {
      throw new Error(data.message || "Failed to get payment URL");
    }
    return {
      redirectUrl: data.redirectUrl || data.paymentLink || data.upiLink,
      paymentLink: data.paymentLink,
      upiLink: data.upiLink,
      transactionId: data.transactionId,
      orderId: data.orderId,
    };
  }

  /** Initiate payout (withdrawal) via xpaysafe to beneficiary bank account. */
  async initiatePayout(params: {
    amount: number;
    accountNumber: string;
    ifsc: string;
    bankName?: string;
    beneficiaryName: string;
  }): Promise<{ success: boolean; orderId: string; balance: number; message?: string }> {
    const response = await axios.post(
      "/api/payments/payout",
      params,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  /** Legacy: direct purchase without payment gateway (used if gateway is disabled). */
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



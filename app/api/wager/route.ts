import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import crypto from "crypto";
import { getPool } from "@/lib/db";

const DEFAULT_API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api/v1";

function generateSignature(apiKey: string, body: any): string {
  const bodyStr = JSON.stringify(body);
  return crypto
    .createHmac("sha256", apiKey)
    .update(bodyStr)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  // Get API key from environment variable (backend only)
  const apiKey = process.env.MERCHANT_API_KEY;
  const customEndpoint = request.headers.get("X-API-Endpoint");
  const userId = request.headers.get("X-User-ID");

  // Transaction tracking for rollback
  let transactionId: number | null = null;
  let stakeAmount = 0;
  let userIdDb: string | null = null;
  const pool = getPool();

  try {

    if (!apiKey) {
      return NextResponse.json(
        { message: "API key not configured. Please set MERCHANT_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    const body = await request.json();
    stakeAmount = parseFloat(body.stake);

    // 1. Balance Check & Reservation (if user is identified)
    if (userId && !isNaN(stakeAmount) && stakeAmount > 0) {
      // Get user from DB
      const userResult = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [userId]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json({ message: "User not found" }, { status: 400 });
      }

      userIdDb = userResult.rows[0].id;

      // Check balance
      const balanceResult = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as balance
         FROM wallet_transactions
         WHERE user_id = $1`,
        [userIdDb]
      );

      const currentBalance = parseFloat(balanceResult.rows[0].balance) || 0;

      if (currentBalance < stakeAmount) {
        return NextResponse.json(
          { message: `Insufficient balance. Available: $${currentBalance.toFixed(2)}` },
          { status: 400 }
        );
      }

      // Deduct (Reserve) funds
      const newBalance = currentBalance - stakeAmount;
      const txResult = await pool.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
         VALUES ($1, 'withdraw', $2, $3, $4)
         RETURNING id`,
        [
          userIdDb,
          -stakeAmount, // Negative amount for withdrawal
          newBalance,
          `Wager reservation for market ${body.marketId}`
        ]
      );
      transactionId = txResult.rows[0].id;
    }

    // Generate HMAC signature
    const signature = generateSignature(apiKey, body);

    // Use custom endpoint if provided, otherwise use default
    const apiBaseUrl = customEndpoint || DEFAULT_API_BASE_URL;
    // Handle different URL patterns: /v1, /api/v1, or just base URL
    let baseUrl = apiBaseUrl.trim();
    // Remove trailing slash if present
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }
    // If URL doesn't end with /v1 or /api/v1, try to construct it
    if (!baseUrl.endsWith("/v1") && !baseUrl.endsWith("/api/v1")) {
      // If it already includes /api/, add /v1
      if (baseUrl.includes("/api/")) {
        baseUrl = `${baseUrl}/v1`;
      } else {
        // Otherwise, add /api/v1 (preferred pattern)
        baseUrl = `${baseUrl}/api/v1`;
      }
    }
    const apiUrl = `${baseUrl}/wager`;

    const response = await axios.post(apiUrl, body, {
      headers: {
        "X-Merchant-API-Key": apiKey,
        "X-Merchant-Signature": signature,
        "Content-Type": "application/json",
      },
    });

    // If successful, we could update the transaction description to include the Wager ID if we wanted,
    // but the reservation is already valid.

    return NextResponse.json(response.data, { status: 201 });
  } catch (error: any) {

    // Rollback logic: Refund if we reserved funds but API call failed
    if (transactionId && userIdDb) {
      try {
        // We need to calculate the balance *again* or trust the logic. 
        // Simplest is to just insert a deposit to reverse it.
        // We fetch current balance to keep balance_after correct.
        const balanceResult = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as balance FROM wallet_transactions WHERE user_id = $1`,
          [userIdDb]
        );
        const currentBalance = parseFloat(balanceResult.rows[0].balance) || 0;
        const newBalance = currentBalance + stakeAmount;

        await pool.query(
          `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
            VALUES ($1, 'deposit', $2, $3, $4)`,
          [
            userIdDb,
            stakeAmount,
            newBalance,
            `Refund: Wager implementation failed`
          ]
        );
        console.log(`Refunded $${stakeAmount} to user ${userIdDb} due to wager failure`);
      } catch (refundError) {
        console.error("CRITICAL: Failed to refund user after wager failure", refundError);
      }
    }

    console.error("Error placing wager:", error);

    if (error.response) {
      const status = error.response.status;
      let message = error.response.data?.message || "Failed to place wager";

      switch (status) {
        case 401:
          message = "Invalid or missing API key";
          break;
        case 403:
          message = "Invalid signature or IP not whitelisted";
          break;
        case 400:
          message = message || "Invalid parameters or market is closed";
          break;
        case 404:
          message = "Market not found";
          break;
        case 500:
          message = "Internal server error. Please try again later";
          break;
      }

      return NextResponse.json({ message }, { status });
    }

    // Handle DNS/network errors
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      const apiBaseUrl = customEndpoint || DEFAULT_API_BASE_URL;
      return NextResponse.json(
        {
          message: `Cannot connect to API endpoint "${apiBaseUrl}". The domain may not exist or the server is unreachable. Please check your API endpoint configuration in settings.`
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        message: error.message || "Network error. Please check your connection and API endpoint configuration."
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

function getUserId(request: NextRequest): string | null {
  const userId = request.headers.get("X-User-ID");
  return userId;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const pool = getPool();

    // Get or create user
    let userResult = await pool.query(
      "SELECT id FROM users WHERE firebase_uid = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ balance: 0 });
    }

    const userId_db = userResult.rows[0].id;

    // Calculate balance from wallet transactions
    const balanceResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as balance
       FROM wallet_transactions
       WHERE user_id = $1`,
      [userId_db]
    );

    const balance = parseFloat(balanceResult.rows[0].balance) || 0;

    return NextResponse.json({ balance: Math.max(0, balance) });
  } catch (error: any) {
    console.error("Error fetching wallet balance:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
    return NextResponse.json(
      { 
        message: error.message || "Failed to fetch balance",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, amount, description } = body;

    if (!type || !amount || (type !== "deposit" && type !== "withdraw")) {
      return NextResponse.json(
        { message: "Invalid request. Type must be 'deposit' or 'withdraw', and amount is required." },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Get or create user
    let userResult = await pool.query(
      "SELECT id FROM users WHERE firebase_uid = $1",
      [userId]
    );

    let userId_db: string;
    if (userResult.rows.length === 0) {
      const newUser = await pool.query(
        "INSERT INTO users (firebase_uid, email) VALUES ($1, $2) RETURNING id",
        [userId, body.email || `${userId}@indimarket.local`]
      );
      userId_db = newUser.rows[0].id;
    } else {
      userId_db = userResult.rows[0].id;
    }

    // Get current balance
    const currentBalanceResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as balance
       FROM wallet_transactions
       WHERE user_id = $1`,
      [userId_db]
    );
    const currentBalance = parseFloat(currentBalanceResult.rows[0].balance) || 0;

    // Check if withdrawal is valid
    if (type === "withdraw" && amount > currentBalance) {
      return NextResponse.json(
        { message: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Calculate new balance
    const transactionAmount = type === "deposit" ? amount : -amount;
    const newBalance = currentBalance + transactionAmount;

    // Create wallet transaction
    const result = await pool.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [
        userId_db,
        type,
        transactionAmount,
        newBalance,
        description || `${type === "deposit" ? "Deposit" : "Withdrawal"} of $${amount.toFixed(2)}`,
      ]
    );

    return NextResponse.json({
      success: true,
      balance: newBalance,
      transaction: {
        id: result.rows[0].id,
        type,
        amount: transactionAmount,
        balance: newBalance,
        timestamp: result.rows[0].created_at,
      },
    });
  } catch (error: any) {
    console.error("Error processing wallet transaction:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
    return NextResponse.json(
      { 
        message: error.message || "Failed to process transaction",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}


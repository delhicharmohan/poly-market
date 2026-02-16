import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { createPayout } from "@/lib/xpaysafe";

function getUserId(request: NextRequest): string | null {
  return request.headers.get("X-User-ID");
}

function generatePayoutOrderId(): string {
  const timePart = Math.floor(Date.now() / 1000) % 1000000;
  const randomPart = Math.floor(Math.random() * 10000) + 1;
  return `PAYOUT-${timePart}${randomPart}`;
}

/**
 * Initiate xpaysafe payout (withdrawal) for a user.
 * Deducts from wallet balance and sends payout to beneficiary bank account.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, accountNumber, ifsc, bankName, beneficiaryName } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ message: "Amount must be greater than 0" }, { status: 400 });
    }
    if (!accountNumber || !ifsc || !beneficiaryName) {
      return NextResponse.json(
        { message: "Missing required fields: accountNumber, ifsc, beneficiaryName" },
        { status: 400 }
      );
    }

    const pool = getPool();

    const userResult = await pool.query(
      "SELECT id, email, display_name FROM users WHERE firebase_uid = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const userIdDb = userResult.rows[0].id;

    // Check balance
    const balanceResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as balance FROM wallet_transactions WHERE user_id = $1`,
      [userIdDb]
    );
    const currentBalance = parseFloat(balanceResult.rows[0].balance) || 0;
    const withdrawAmount = Math.round(parseFloat(String(amount)) * 100) / 100;

    if (withdrawAmount > currentBalance) {
      return NextResponse.json({ message: "Insufficient balance" }, { status: 400 });
    }

    const orderId = generatePayoutOrderId();
    const timestamp = Math.floor(Date.now() / 1000);

    // Deduct from wallet first
    const newBalance = currentBalance - withdrawAmount;
    const wtResult = await pool.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
       VALUES ($1, 'withdraw', $2, $3, $4) RETURNING id`,
      [userIdDb, -withdrawAmount, newBalance, `Withdrawal to bank: ${orderId}`]
    );
    const walletTransactionId = wtResult.rows[0].id;

    // Call xpaysafe payout
    let payoutResponse;
    try {
      payoutResponse = await createPayout({
        orderId,
        amount: withdrawAmount,
        currency: "INR",
        beneficiary_details: {
          name: beneficiaryName,
          accountNumber,
          ifsc,
          bankName: bankName || "Bank",
          address: "India",
        },
        timestamp,
      });
    } catch (payoutError: any) {
      // Reverse the wallet deduction if payout API call itself fails
      const revertBalance = newBalance + withdrawAmount;
      await pool.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
         VALUES ($1, 'deposit', $2, $3, $4)`,
        [userIdDb, withdrawAmount, revertBalance, `Payout failed – refund: ${orderId}`]
      );
      throw payoutError;
    }

    // Track payout in pending_payouts for webhook-driven status updates / refunds
    try {
      await pool.query(
        `INSERT INTO pending_payouts (order_id, user_id, amount_inr, beneficiary_name, account_number, ifsc, gateway_transaction_id, wallet_transaction_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')`,
        [
          orderId,
          userIdDb,
          withdrawAmount,
          beneficiaryName,
          accountNumber,
          ifsc,
          payoutResponse.transactionId || null,
          walletTransactionId,
        ]
      );
    } catch (trackingError: any) {
      // Non-fatal: payout was already sent to gateway, just log the tracking failure
      console.error("[payout] Failed to insert pending_payouts record:", trackingError.message);
    }

    return NextResponse.json({
      success: true,
      orderId,
      transactionId: payoutResponse.transactionId,
      status: payoutResponse.status || "PENDING",
      balance: newBalance,
      message: "Payout initiated successfully",
    });
  } catch (error: any) {
    console.error("Payout error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to initiate payout" },
      { status: 500 }
    );
  }
}

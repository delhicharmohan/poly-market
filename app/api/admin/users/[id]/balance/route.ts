import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Admin: add or remove funds from a user's wallet. Body: { type: "deposit"|"withdraw", amount: number } */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        if (!(await isAdmin(request))) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const { id } = params;
        if (!id) {
            return NextResponse.json({ message: "User ID is required" }, { status: 400 });
        }

        const body = await request.json();
        const { type, amount } = body;

        if (!type || !amount || (type !== "deposit" && type !== "withdraw")) {
            return NextResponse.json(
                { message: "type must be 'deposit' or 'withdraw', and amount is required" },
                { status: 400 }
            );
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json({ message: "Amount must be a positive number" }, { status: 400 });
        }

        const pool = getPool();

        // Verify user exists
        const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [id]);
        if (userCheck.rowCount === 0) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Get current balance
        const balResult = await pool.query(
            "SELECT COALESCE(SUM(amount), 0)::float as balance FROM wallet_transactions WHERE user_id = $1",
            [id]
        );
        const currentBalance = parseFloat(balResult.rows[0].balance) || 0;

        if (type === "withdraw" && parsedAmount > currentBalance) {
            return NextResponse.json(
                { message: `Insufficient balance. Current: ₹${currentBalance.toFixed(2)}` },
                { status: 400 }
            );
        }

        const txAmount = type === "deposit" ? parsedAmount : -parsedAmount;
        const newBalance = currentBalance + txAmount;

        await pool.query(
            `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
       VALUES ($1, $2, $3, $4, $5)`,
            [
                id,
                type,
                txAmount,
                newBalance,
                `Admin ${type}: ₹${parsedAmount.toFixed(2)}`,
            ]
        );

        return NextResponse.json({
            success: true,
            balance: newBalance,
            message: `${type === "deposit" ? "Added" : "Removed"} ₹${parsedAmount.toFixed(2)}`,
        });
    } catch (error: any) {
        console.error("Error adjusting user balance:", error);
        return NextResponse.json(
            { message: error.message || "Failed to adjust balance" },
            { status: 500 }
        );
    }
}

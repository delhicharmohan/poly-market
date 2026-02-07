import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT 
        wt.id,
        u.email as "userEmail",
        u.display_name as "userDisplayName",
        wt.type,
        wt.amount,
        wt.balance_after as "balanceAfter",
        wt.description,
        EXTRACT(EPOCH FROM wt.created_at) * 1000 as timestamp,
        w.wager_id as "wagerId",
        w.market_id as "marketId",
        w.selection,
        w.stake,
        w.odds_yes as "oddsYes",
        w.odds_no as "oddsNo",
        w.potential_win as "potentialWin",
        w.status as "wagerStatus",
        w.market_status as "marketStatus",
        m.title as "marketTitle"
      FROM wallet_transactions wt
      JOIN users u ON u.id = wt.user_id
      LEFT JOIN wagers w ON wt.wager_id = w.id
      LEFT JOIN markets m ON w.market_id = m.id
      ORDER BY wt.created_at DESC
      LIMIT 500`
    );

    const transactions = result.rows.map((row) => ({
      id: row.id,
      userEmail: row.userEmail,
      userDisplayName: row.userDisplayName,
      type: row.type,
      amount: parseFloat(row.amount),
      balanceAfter: parseFloat(row.balanceAfter),
      description: row.description,
      timestamp: parseInt(row.timestamp),
      wagerId: row.wagerId,
      marketId: row.marketId,
      marketTitle: row.marketTitle,
      selection: row.selection,
      stake: row.stake != null ? parseFloat(row.stake) : undefined,
      odds: row.oddsYes != null ? { yes: parseFloat(row.oddsYes), no: parseFloat(row.oddsNo) } : undefined,
      potentialWin: row.potentialWin != null ? parseFloat(row.potentialWin) : undefined,
      status: row.wagerStatus,
      marketStatus: row.marketStatus,
    }));

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error("Error fetching admin transactions:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

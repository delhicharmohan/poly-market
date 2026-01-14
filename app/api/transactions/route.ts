import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

// Get user ID from request (from Firebase UID in header)
function getUserId(request: NextRequest): string | null {
  // Get Firebase UID from custom header set by client
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

    // Get user ID from database
    const userResult = await pool.query(
      "SELECT id FROM users WHERE firebase_uid = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ transactions: [] });
    }

    const userId_db = userResult.rows[0].id;

    // Fetch wagers
    const wagersResult = await pool.query(
      `SELECT 
        w.id,
        w.wager_id as "wagerId",
        w.market_id as "marketId",
        m.title as "marketTitle",
        w.selection,
        w.stake,
        w.odds_yes as "oddsYes",
        w.odds_no as "oddsNo",
        w.potential_win as "potentialWin",
        w.actual_payout as "payout",
        w.status,
        w.market_status as "marketStatus",
        EXTRACT(EPOCH FROM w.created_at) * 1000 as timestamp
      FROM wagers w
      LEFT JOIN markets m ON w.market_id = m.id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
      LIMIT 100`,
      [userId_db]
    );

    // Fetch wallet transactions (deposits, withdrawals, wins)
    const walletResult = await pool.query(
      `SELECT 
        wt.id,
        wt.type,
        wt.amount,
        wt.balance_after as "balanceAfter",
        wt.description,
        wt.wager_id as "wagerId",
        EXTRACT(EPOCH FROM wt.created_at) * 1000 as timestamp
      FROM wallet_transactions wt
      WHERE wt.user_id = $1
      ORDER BY wt.created_at DESC
      LIMIT 100`,
      [userId_db]
    );

    // Map wagers to transactions
    const wagerTransactions = wagersResult.rows.map((row) => ({
      id: row.id,
      type: "wager" as const,
      wagerId: row.wagerId,
      marketId: row.marketId,
      marketTitle: row.marketTitle || "Unknown Market",
      selection: row.selection as "yes" | "no",
      stake: parseFloat(row.stake),
      amount: -parseFloat(row.stake), // Negative for wager
      odds: {
        yes: parseFloat(row.oddsYes),
        no: parseFloat(row.oddsNo),
      },
      potentialWin: parseFloat(row.potentialWin),
      payout: row.payout !== null ? parseFloat(row.payout) : undefined,
      status: row.status,
      timestamp: parseInt(row.timestamp),
      marketStatus: row.marketStatus,
    }));

    // Map wallet transactions
    const walletTransactions = walletResult.rows.map((row) => {
      const baseTx = {
        id: row.id,
        type: row.type as "deposit" | "withdraw" | "win",
        amount: parseFloat(row.amount),
        balanceAfter: parseFloat(row.balanceAfter),
        description: row.description,
        timestamp: parseInt(row.timestamp),
      };

      // For win transactions, try to get wager details if wager_id exists
      if (row.type === "win" && row.wagerId) {
        const wager = wagersResult.rows.find((w) => w.id === row.wagerId);
        if (wager) {
          return {
            ...baseTx,
            wagerId: wager.wagerId,
            marketId: wager.marketId,
            marketTitle: wager.marketTitle || "Unknown Market",
            payout: parseFloat(row.amount), // Win amount is the payout
            marketStatus: wager.marketStatus,
            status: "WON",
          };
        }
      }

      return baseTx;
    });

    // Combine and sort by timestamp (most recent first)
    const allTransactions = [...wagerTransactions, ...walletTransactions].sort(
      (a, b) => b.timestamp - a.timestamp
    );

    return NextResponse.json({ transactions: allTransactions });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch transactions" },
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
    const { wagerId, marketId, marketTitle, selection, stake, odds, potentialWin, status, marketStatus } = body;

    if (!wagerId || !marketId || !selection || !stake || !odds) {
      return NextResponse.json(
        { message: "Missing required fields" },
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
      // Create user if doesn't exist
      const newUser = await pool.query(
        "INSERT INTO users (firebase_uid, email) VALUES ($1, $2) RETURNING id",
        [userId, body.email || `${userId}@indimarket.local`]
      );
      userId_db = newUser.rows[0].id;
    } else {
      userId_db = userResult.rows[0].id;
    }

    // Insert or update market
    await pool.query(
      `INSERT INTO markets (id, title, status, pool_yes, pool_no, total_pool, odds_yes, odds_no)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         status = EXCLUDED.status,
         odds_yes = EXCLUDED.odds_yes,
         odds_no = EXCLUDED.odds_no,
         updated_at = CURRENT_TIMESTAMP`,
      [
        marketId,
        marketTitle || "Unknown Market",
        marketStatus || "OPEN",
        0, // pool_yes
        0, // pool_no
        0, // total_pool
        odds.yes,
        odds.no,
      ]
    );

    // Insert wager
    const wagerResult = await pool.query(
      `INSERT INTO wagers (
        wager_id, user_id, market_id, selection, stake,
        odds_yes, odds_no, potential_win, status, market_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (wager_id) DO NOTHING
      RETURNING id, created_at`,
      [
        wagerId,
        userId_db,
        marketId,
        selection,
        stake,
        odds.yes,
        odds.no,
        potentialWin,
        status || "PENDING",
        marketStatus || "OPEN",
      ]
    );

    // Create wallet transaction
    await pool.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description, wager_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId_db,
        "wager",
        -stake, // Negative for withdrawal
        0, // balance_after (would need to calculate from wallet)
        `Wager placed on ${marketTitle}`,
        wagerResult.rows[0]?.id || null,
      ]
    );

    return NextResponse.json(
      { success: true, id: wagerResult.rows[0]?.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error saving transaction:", error);
    return NextResponse.json(
      { message: error.message || "Failed to save transaction" },
      { status: 500 }
    );
  }
}


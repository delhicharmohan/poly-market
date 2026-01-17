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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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

    /**
     * UNIFIED TRANSACTION QUERY
     * We fetch from wallet_transactions as the source of truth for balance movements,
     * and JOIN with wagers and markets to get context if they are wager-related.
     */
    const result = await pool.query(
      `SELECT 
        wt.id,
        wt.type,
        wt.amount,
        wt.balance_after as "balanceAfter",
        wt.description,
        wt.wager_id as "wagerIdDb",
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
      LEFT JOIN wagers w ON wt.wager_id = w.id
      LEFT JOIN markets m ON w.market_id = m.id
      WHERE wt.user_id = $1
      ORDER BY wt.created_at DESC
      LIMIT 100`,
      [userId_db]
    );

    const transactions = result.rows.map((row) => {
      const isWagerRelated = row.type === 'wager' || row.type === 'win' || (row.type === 'withdraw' && row.wagerIdDb);

      return {
        id: row.id,
        type: row.type,
        amount: parseFloat(row.amount),
        balanceAfter: parseFloat(row.balanceAfter),
        description: row.description,
        timestamp: parseInt(row.timestamp),
        wagerId: row.wagerId,
        marketId: row.marketId,
        marketTitle: row.marketTitle || (row.type === 'win' ? "Winnings" : (row.type === 'withdraw' ? "Withdrawal" : "Deposit")),
        selection: row.selection,
        stake: row.stake ? parseFloat(row.stake) : undefined,
        odds: row.oddsYes ? {
          yes: parseFloat(row.oddsYes),
          no: parseFloat(row.oddsNo),
        } : undefined,
        potentialWin: row.potentialWin ? parseFloat(row.potentialWin) : undefined,
        payout: row.type === 'win' ? parseFloat(row.amount) : (row.wagerStatus === 'WON' ? row.potentialWin : undefined),
        status: row.wagerStatus || 'COMPLETED',
        marketStatus: row.marketStatus || 'OPEN',
      };
    });

    return NextResponse.json({ transactions });
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
      ON CONFLICT (wager_id) DO UPDATE SET
        status = EXCLUDED.status,
        market_status = EXCLUDED.market_status
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

    const dbWagerId = wagerResult.rows[0]?.id;

    if (dbWagerId) {
      // LINK RESERVATION: Update the most recent unlinked withdrawal for this user
      // to point to this wager. This prevents double-counting in the unified view.
      await pool.query(
        `UPDATE wallet_transactions 
         SET wager_id = $1 
         WHERE id = (
           SELECT id FROM wallet_transactions 
           WHERE user_id = $2 AND type = 'withdraw' AND wager_id IS NULL
           ORDER BY created_at DESC 
           LIMIT 1
         )`,
        [dbWagerId, userId_db]
      );
    }

    return NextResponse.json(
      { success: true, id: dbWagerId },
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


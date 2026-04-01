import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

function getUserIdHeader(request: NextRequest): string | null {
  return request.headers.get("X-User-ID");
}

export async function GET(request: NextRequest) {
  try {
    const pool = getPool();
    
    // Fetch challenges with creator info and aggregate bet info
    const query = `
      SELECT 
        c.*,
        u.display_name as creator_name,
        u.email as creator_email,
        COALESCE(SUM(CASE WHEN cb.side = 'X' THEN cb.amount ELSE 0 END), 0) as total_side_x,
        COALESCE(SUM(CASE WHEN cb.side = 'Y' THEN cb.amount ELSE 0 END), 0) as total_side_y
      FROM challenges c
      JOIN users u ON c.creator_id = u.id
      LEFT JOIN challenge_bets cb ON c.id = cb.challenge_id
      GROUP BY c.id, u.id
      ORDER BY c.created_at DESC
    `;
    
    const result = await pool.query(query);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json(
      { message: "Failed to fetch challenges", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const firebaseUid = getUserIdHeader(request);
    if (!firebaseUid) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topic, outcome_x, outcome_y, target_stake, expires_at } = body;

    if (!topic || !outcome_x || !outcome_y || !target_stake) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (parseFloat(target_stake) <= 0) {
      return NextResponse.json({ message: "Target stake must be greater than 0" }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Get user database ID
      const userRes = await client.query("SELECT id FROM users WHERE firebase_uid = $1", [firebaseUid]);
      if (userRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ message: "User not found in database" }, { status: 404 });
      }
      const userId = userRes.rows[0].id;

      // 2. Check balance
      const balanceRes = await client.query(
        "SELECT COALESCE(SUM(amount), 0) as balance FROM wallet_transactions WHERE user_id = $1",
        [userId]
      );
      const currentBalance = parseFloat(balanceRes.rows[0].balance) || 0;
      const stakeNum = parseFloat(target_stake);

      if (currentBalance < stakeNum) {
        await client.query("ROLLBACK");
        return NextResponse.json({ message: "Insufficient balance" }, { status: 400 });
      }

      // 3. Create challenge
      const challengeRes = await client.query(
        `INSERT INTO challenges (creator_id, topic, outcome_x, outcome_y, target_stake, expires_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
         RETURNING id`,
        [userId, topic, outcome_x, outcome_y, stakeNum, expires_at]
      );
      const challengeId = challengeRes.rows[0].id;

      // 4. Create initial bet (Creator on side X)
      await client.query(
        `INSERT INTO challenge_bets (challenge_id, user_id, side, amount)
         VALUES ($1, $2, 'X', $3)`,
        [challengeId, userId, stakeNum]
      );

      // 5. Deduct from wallet
      const newBalance = currentBalance - stakeNum;
      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
         VALUES ($1, 'wager', $2, $3, $4)`,
        [userId, -stakeNum, newBalance, `Challenge created: ${topic}`]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        challengeId,
        message: "Challenge created successfully"
      });
    } catch (err: any) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error creating challenge:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

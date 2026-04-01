import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

function getUserIdHeader(request: NextRequest): string | null {
  return request.headers.get("X-User-ID");
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const challengeId = params.id;
  
  try {
    const firebaseUid = getUserIdHeader(request);
    if (!firebaseUid) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { side, amount } = body;

    if (!side || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ message: "Invalid side or amount" }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Get user database ID
      const userRes = await client.query("SELECT id FROM users WHERE firebase_uid = $1", [firebaseUid]);
      if (userRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ message: "User not found" }, { status: 404 });
      }
      const userId = userRes.rows[0].id;

      // 2. Get challenge details and current pool
      const challengeRes = await client.query(
        `SELECT c.*, 
                COALESCE(SUM(CASE WHEN cb.side = 'X' THEN cb.amount ELSE 0 END), 0) as total_x,
                COALESCE(SUM(CASE WHEN cb.side = 'Y' THEN cb.amount ELSE 0 END), 0) as total_y
         FROM challenges c
         LEFT JOIN challenge_bets cb ON c.id = cb.challenge_id
         WHERE c.id = $1
         GROUP BY c.id`,
        [challengeId]
      );

      if (challengeRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ message: "Challenge not found" }, { status: 404 });
      }

      const challenge = challengeRes.rows[0];
      const totalX = parseFloat(challenge.total_x);
      const totalY = parseFloat(challenge.total_y);
      const targetStake = parseFloat(challenge.target_stake);
      const joinAmount = parseFloat(amount);

      if (challenge.status === "SETTLED" || challenge.status === "CLOSED") {
        await client.query("ROLLBACK");
        return NextResponse.json({ message: "Challenge is already closed or settled" }, { status: 400 });
      }

      // 3. Logic: If PENDING, must join side 'Y'
      if (challenge.status === "PENDING" && side !== "Y") {
        await client.query("ROLLBACK");
        return NextResponse.json({ message: "Challenge is waiting for side Y to be filled" }, { status: 400 });
      }

      // 4. Check balance
      const balanceRes = await client.query(
        "SELECT COALESCE(SUM(amount), 0) as balance FROM wallet_transactions WHERE user_id = $1",
        [userId]
      );
      const currentBalance = parseFloat(balanceRes.rows[0].balance) || 0;

      if (currentBalance < joinAmount) {
        await client.query("ROLLBACK");
        return NextResponse.json({ message: "Insufficient balance" }, { status: 400 });
      }

      // 5. Create bet
      await client.query(
        `INSERT INTO challenge_bets (challenge_id, user_id, side, amount)
         VALUES ($1, $2, $3, $4)`,
        [challengeId, userId, side, joinAmount]
      );

      // 6. Deduct from wallet
      const newBalance_wallet = currentBalance - joinAmount;
      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
         VALUES ($1, 'wager', $2, $3, $4)`,
        [userId, -joinAmount, newBalance_wallet, `Joined challenge: ${challenge.topic} (Side ${side})`]
      );

      // 7. Update challenge status if side Y is now filled
      const newTotalY = side === "Y" ? totalY + joinAmount : totalY;
      if (challenge.status === "PENDING" && newTotalY >= targetStake) {
        await client.query(
          "UPDATE challenges SET status = 'ACTIVE' WHERE id = $1",
          [challengeId]
        );
      }

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: "Successfully joined challenge"
      });
    } catch (err: any) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error joining challenge:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

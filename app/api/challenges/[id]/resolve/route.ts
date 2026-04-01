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
    const { winningSide } = body; // 'X' or 'Y'

    if (winningSide !== "X" && winningSide !== "Y") {
      return NextResponse.json({ message: "Invalid winning side" }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Get challenge details
      const challengeRes = await client.query(
        "SELECT * FROM challenges WHERE id = $1",
        [challengeId]
      );

      if (challengeRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ message: "Challenge not found" }, { status: 404 });
      }

      const challenge = challengeRes.rows[0];
      if (challenge.status === "SETTLED") {
        await client.query("ROLLBACK");
        return NextResponse.json({ message: "Challenge already settled" }, { status: 400 });
      }

      // Check if user is creator or admin (for now, allow creator)
      const userRes = await client.query("SELECT id FROM users WHERE firebase_uid = $1", [firebaseUid]);
      const userId = userRes.rows[0]?.id;
      // if (userId !== challenge.creator_id) {
      //    // Optional: restrict to creator
      // }

      // 2. Fetch all bets
      const betsRes = await client.query(
        "SELECT * FROM challenge_bets WHERE challenge_id = $1",
        [challengeId]
      );
      const bets = betsRes.rows;

      const totalPool = bets.reduce((sum: number, bet: any) => sum + parseFloat(bet.amount), 0);
      const winningBets = bets.filter((bet: any) => bet.side === winningSide);
      const totalWinningStake = winningBets.reduce((sum: number, bet: any) => sum + parseFloat(bet.amount), 0);

      if (totalWinningStake === 0) {
        // No winners? Maybe refund or house take. For now, just mark settled.
        await client.query(
          "UPDATE challenges SET status = 'SETTLED' WHERE id = $1",
          [challengeId]
        );
      } else {
        // 3. Distribute payouts
        for (const bet of winningBets) {
          const share = parseFloat(bet.amount) / totalWinningStake;
          const payout = share * totalPool;

          // Get user's current balance
          const balanceRes = await client.query(
            `SELECT COALESCE(SUM(amount), 0) as balance
             FROM wallet_transactions
             WHERE user_id = $1`,
            [bet.user_id]
          );
          const currentBalance = parseFloat(balanceRes.rows[0].balance) || 0;
          const newBalance = currentBalance + payout;

          // Add to wallet
          await client.query(
            `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
             VALUES ($1, 'win', $2, $3, $4)`,
            [bet.user_id, payout, newBalance, `Winnings from challenge: ${challenge.topic}`]
          );
        }

        // 4. Update challenge status
        await client.query(
          "UPDATE challenges SET status = 'SETTLED' WHERE id = $1",
          [challengeId]
        );
      }

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: "Challenge settled successfully"
      });
    } catch (err: any) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error settling challenge:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

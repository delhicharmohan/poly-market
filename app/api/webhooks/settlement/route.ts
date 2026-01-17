import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import * as crypto from "crypto";

// Verify webhook signature from provider
function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get API key from environment variable (backend only)
    const apiKey = process.env.MERCHANT_API_KEY;
    const signature = request.headers.get("X-Merchant-Signature") || request.headers.get("X-Webhook-Signature") || "";

    if (!apiKey) {
      return NextResponse.json(
        { message: "API key not configured. Please set MERCHANT_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify webhook signature using the API key from env as the secret
    if (signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, apiKey);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return NextResponse.json(
          { message: "Invalid signature" },
          { status: 401 }
        );
      }
    } else {
      // Signature is recommended but not strictly required if provider doesn't send it
      console.warn("Webhook received without signature. Consider implementing signature verification for security.");
    }

    // Parse the webhook payload
    const payload = JSON.parse(rawBody);
    const {
      event,
      marketId,
      marketStatus,
      outcome, // 'yes' or 'no' - the winning outcome
      timestamp,
      marketTitle // Optional: market title if provided
    } = payload;

    // Validate required fields
    if (!event || !marketId || !marketStatus || !outcome) {
      return NextResponse.json(
        { message: "Missing required fields: event, marketId, marketStatus, outcome" },
        { status: 400 }
      );
    }

    // Validate outcome
    if (outcome !== "yes" && outcome !== "no") {
      return NextResponse.json(
        { message: "Invalid outcome. Must be 'yes' or 'no'" },
        { status: 400 }
      );
    }

    // Only process settlement events
    if (event !== "market.settled" && event !== "market.settlement") {
      return NextResponse.json(
        { message: `Event type '${event}' not supported. Expected 'market.settled' or 'market.settlement'` },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Start a transaction
    await pool.query("BEGIN");

    try {
      // Check if market exists, create if it doesn't
      const marketCheck = await pool.query(
        "SELECT id, title, status FROM markets WHERE id = $1",
        [marketId]
      );

      if (marketCheck.rows.length === 0) {
        // Market doesn't exist, create it with SETTLED status
        await pool.query(
          `INSERT INTO markets (id, title, status, resolution_timestamp, pool_yes, pool_no, total_pool, odds_yes, odds_no)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status,
             resolution_timestamp = EXCLUDED.resolution_timestamp,
             updated_at = CURRENT_TIMESTAMP`,
          [
            marketId,
            payload.marketTitle || `Market ${marketId}`, // Use marketTitle from payload if provided
            marketStatus.toUpperCase(),
            timestamp || Date.now(),
            0, // pool_yes
            0, // pool_no
            0, // total_pool
            1.0, // odds_yes (default)
            1.0, // odds_no (default)
          ]
        );
      } else {
        // Market exists, update its status
        const updateResult = await pool.query(
          `UPDATE markets 
           SET status = $1, 
               resolution_timestamp = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [
            marketStatus.toUpperCase(),
            timestamp || Date.now(),
            marketId,
          ]
        );

        if (updateResult.rowCount === 0) {
          await pool.query("ROLLBACK");
          return NextResponse.json(
            { message: `Failed to update market '${marketId}'` },
            { status: 500 }
          );
        }
      }

      // Update all wagers for this market
      // Mark winning wagers as WON and losing as LOST
      if (!outcome) {
        throw new Error("Outcome is required. Must be 'yes' or 'no'");
      }

      // Update all wagers for this market
      const wagerUpdateResult = await pool.query(
        `UPDATE wagers 
         SET status = CASE 
           WHEN selection = $1 THEN 'WON'
           ELSE 'LOST'
         END,
         market_status = $2,
         updated_at = CURRENT_TIMESTAMP
         WHERE market_id = $3`,
        [
          outcome,
          marketStatus.toUpperCase(),
          marketId,
        ]
      );

      // Log how many wagers were updated
      if (wagerUpdateResult.rowCount === 0) {
        console.warn(`No wagers found for market '${marketId}' to update`);
      }

      // Credit winnings to users who won
      // Calculate payout: stake * odds for winning selection
      const winningWagers = await pool.query(
        `SELECT w.id, w.user_id, w.stake, w.potential_win,
                CASE WHEN w.selection = 'yes' THEN w.odds_yes ELSE w.odds_no END as odds
         FROM wagers w
         WHERE w.market_id = $1 
           AND w.selection = $2`,
        [marketId, outcome]
      );

      for (const wager of winningWagers.rows) {
        // IDEMPOTENCY CHECK: Check if this wager has already been credited
        const existingWinResult = await pool.query(
          "SELECT id FROM wallet_transactions WHERE wager_id = $1 AND type = 'win'",
          [wager.id]
        );

        if (existingWinResult.rows.length > 0) {
          console.log(`Wager ${wager.id} already has a win transaction credited. Skipping.`);
          continue;
        }

        // Use potential_win as the payout (already calculated when wager was placed)
        const payout = parseFloat(wager.potential_win);

        // Update wager with actual payout
        await pool.query(
          `UPDATE wagers 
           SET actual_payout = $1
           WHERE id = $2`,
          [payout, wager.id]
        );

        // Get current balance
        const balanceResult = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as balance
           FROM wallet_transactions
           WHERE user_id = $1`,
          [wager.user_id]
        );
        const currentBalance = parseFloat(balanceResult.rows[0].balance) || 0;
        const newBalance = currentBalance + payout;

        // Create wallet transaction for winnings
        // IMPORTANT: No automated withdrawal or payout occurs here. 
        // Winnings are simply credited to the internal user balance.
        await pool.query(
          `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description, wager_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            wager.user_id,
            "win",
            payout,
            newBalance,
            `Winnings from settled market: ${marketId}`,
            wager.id,
          ]
        );
        console.log(`Successfully credited $${payout.toFixed(2)} to user ${wager.user_id} for winning wager ${wager.id}`);
      }

      // Commit transaction
      await pool.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: "Market settlement processed successfully",
        marketId,
        marketStatus,
        outcome,
      });
    } catch (error) {
      // Rollback on error
      await pool.query("ROLLBACK");
      throw error;
    }
  } catch (error: any) {
    console.error("Error processing settlement webhook:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
    });

    return NextResponse.json(
      {
        message: error.message || "Failed to process settlement webhook",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Allow GET for webhook verification/health check
export async function GET(request: NextRequest) {
  const apiKeyConfigured = !!process.env.MERCHANT_API_KEY;
  return NextResponse.json({
    message: "Webhook endpoint is active",
    endpoint: "/api/webhooks/settlement",
    method: "POST",
    apiKeyConfigured,
    optionalHeaders: ["X-Merchant-Signature", "X-Webhook-Signature"],
    requiredFields: ["event", "marketId", "marketStatus", "outcome"],
    note: "API key is configured server-side via MERCHANT_API_KEY environment variable. Signature is calculated using HMAC-SHA256 with the API key as the secret.",
  });
}


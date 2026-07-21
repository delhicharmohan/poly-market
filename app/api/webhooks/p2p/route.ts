import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { verifyP2PWebhookSignature } from "@/lib/p2p-gateway";
import { sendSaleEmailWithAttachments } from "@/lib/send-sale-email";

function generateInvoiceNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-P2P-${ts}-${r}`;
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.P2P_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { message: "P2P Webhook secret not configured" },
        { status: 500 }
      );
    }

    const rawBody = await request.text();
    const signatureHeader = request.headers.get("X-Signature");

    // Verify webhook signature
    const isValid = verifyP2PWebhookSignature(rawBody, signatureHeader, webhookSecret);
    if (!isValid) {
      console.error("[P2P Webhook] Signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      event: string;
      id: string;
      created: string;
      data: {
        payin_id?: string;
        payout_id?: string;
        external_ref: string;
        amount_paise: number;
        status: string;
        approved_at?: string;
        completed_at?: string;
        utr?: string;
      };
    };

    console.log("[P2P Webhook] Payload verified & parsed:", JSON.stringify(payload));

    const event = payload.event;
    const { external_ref: orderId, status } = payload.data;
    const amountInr = payload.data.amount_paise / 100;

    if (!orderId) {
      return NextResponse.json({ error: "Missing external_ref" }, { status: 400 });
    }

    const pool = getPool();

    // ── 1. PAYOUT / WITHDRAWAL CALLBACK ──
    if (String(orderId).startsWith("PAYOUT-")) {
      const payoutResult = await pool.query(
        `SELECT id, user_id, amount_inr, wallet_transaction_id, status
         FROM pending_payouts WHERE order_id = $1`,
        [orderId]
      );

      if (payoutResult.rows.length === 0) {
        return NextResponse.json({ error: "Unknown payout orderId" }, { status: 404 });
      }

      const payout = payoutResult.rows[0];

      if (payout.status !== "PENDING") {
        return NextResponse.json({ success: true, message: "Payout already processed" });
      }

      if (event === "payout.completed" || status.toUpperCase() === "COMPLETED") {
        await pool.query(
          `UPDATE pending_payouts SET status = 'SUCCESS', completed_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
          [orderId]
        );
        console.log(`[P2P Webhook] Payout ${orderId} completed successfully`);
        return NextResponse.json({ success: true, orderId, message: "Payout completed" });
      }

      if (event === "payout.failed" || event === "payout.expired" || status.toUpperCase() === "FAILED" || status.toUpperCase() === "EXPIRED") {
        // Refund logic
        const refundReason = `Payout ${status.toLowerCase()} – refund: ${orderId}`;
        const existingRefund = await pool.query(
          `SELECT id FROM wallet_transactions WHERE description = $1 AND type = 'deposit'`,
          [refundReason]
        );

        if (existingRefund.rows.length > 0) {
          await pool.query(
            `UPDATE pending_payouts SET status = 'FAILED', completed_at = CURRENT_TIMESTAMP WHERE order_id = $2`,
            [orderId]
          );
          return NextResponse.json({ success: true, message: "Payout already refunded" });
        }

        const userIdDb = payout.user_id;
        const refundAmount = parseFloat(payout.amount_inr);

        const balanceResult = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as balance FROM wallet_transactions WHERE user_id = $1`,
          [userIdDb]
        );
        const currentBalance = parseFloat(balanceResult.rows[0].balance) || 0;
        const newBalance = currentBalance + refundAmount;

        await pool.query(
          `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
           VALUES ($1, 'deposit', $2, $3, $4)`,
          [userIdDb, refundAmount, newBalance, refundReason]
        );

        await pool.query(
          `UPDATE pending_payouts SET status = 'FAILED', completed_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
          [orderId]
        );

        console.log(`[P2P Webhook] Payout ${orderId} failed – refunded ${refundAmount} to user ${userIdDb}`);
        return NextResponse.json({ success: true, orderId, message: "Payout failed - wallet refunded" });
      }

      return NextResponse.json({ success: true, message: `Status update ignored for payout event ${event}` });
    }

    // ── 2. PAYIN / PAYMENT CALLBACK ──
    const pendingResult = await pool.query(
      `SELECT id, user_id, painting_id, painting_name, painting_image_url, amount_inr, status
       FROM pending_payments WHERE order_id = $1`,
      [orderId]
    );

    if (pendingResult.rows.length === 0) {
      return NextResponse.json({ error: "Unknown payin orderId" }, { status: 404 });
    }

    const pending = pendingResult.rows[0];
    if (pending.status !== "PENDING") {
      return NextResponse.json({ success: true, message: "Order already processed" });
    }

    if (event === "payin.declined" || event === "payin.expired" || status.toUpperCase() === "DECLINED" || status.toUpperCase() === "EXPIRED") {
      await pool.query(
        `UPDATE pending_payments SET status = 'FAILED', completed_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
        [orderId]
      );
      return NextResponse.json({ success: true, message: `Payin marked failed: ${status}` });
    }

    if (event === "payin.approved" || status.toUpperCase() === "APPROVED") {
      const userIdDb = pending.user_id;
      const paintingId = pending.painting_id;
      const paintingName = pending.painting_name;
      const paintingImageUrl = pending.painting_image_url;
      const amount = parseFloat(pending.amount_inr);

      const balanceResult = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as balance FROM wallet_transactions WHERE user_id = $1`,
        [userIdDb]
      );
      const balance = parseFloat(balanceResult.rows[0].balance) || 0;
      const newBalance = balance + amount;

      const depositDescription = `Free points (wagering) - P2P Purchase: ${paintingName} (Rs. ${amount.toLocaleString("en-IN")})`;

      const wtResult = await pool.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
         VALUES ($1, 'deposit', $2, $3, $4)
         RETURNING id`,
        [userIdDb, amount, newBalance, depositDescription]
      );
      const walletTransactionId = wtResult.rows[0].id;

      const invoiceNumber = generateInvoiceNumber();
      const saleResult = await pool.query(
        `INSERT INTO sales (user_id, invoice_number, painting_id, painting_name, painting_image_url, amount_inr, wallet_transaction_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, invoice_number`,
        [
          userIdDb,
          invoiceNumber,
          paintingId,
          paintingName,
          paintingImageUrl || null,
          amount,
          walletTransactionId,
        ]
      );
      const sale = saleResult.rows[0];

      await pool.query(
        `UPDATE pending_payments SET status = 'SUCCESS', completed_at = CURRENT_TIMESTAMP, sale_id = $1 WHERE order_id = $2`,
        [sale.id, orderId]
      );

      // Send invoice email
      const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [userIdDb]);
      const userEmail = userResult.rows[0]?.email;
      if (userEmail) {
        const emailResult = await sendSaleEmailWithAttachments({
          to: userEmail,
          paintingName,
          paintingImageUrl: paintingImageUrl || "",
          amountInr: amount,
          invoiceNumber,
        });
        if (emailResult.ok) {
          await pool.query(
            "UPDATE sales SET email_sent_at = CURRENT_TIMESTAMP WHERE id = $1",
            [sale.id]
          );
        }
      }

      return NextResponse.json({
        success: true,
        orderId,
        saleId: sale.id,
        invoiceNumber: sale.invoice_number,
      });
    }

    return NextResponse.json({ success: true, message: `Ignored payin event: ${event}` });
  } catch (error: any) {
    console.error("[P2P Webhook Error]:", error);
    return NextResponse.json({ error: error.message || "Webhook processing failed" }, { status: 500 });
  }
}

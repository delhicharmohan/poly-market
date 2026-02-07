import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPool } from "@/lib/db";
import { sendSaleEmailWithAttachments } from "@/lib/send-sale-email";

function generateInvoiceNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${ts}-${r}`;
}

/**
 * xpaysafe webhook: payment status updates.
 * Signature is in X-Signature header; verified with HMAC-SHA256(rawBody, apiSecret + salt) → base64.
 */
export async function POST(request: NextRequest) {
  try {
    const apiSecret = process.env.XPAYSAFE_API_SECRET;
    const salt = process.env.XPAYSAFE_SALT;

    if (!apiSecret || !salt) {
      return NextResponse.json(
        { message: "xpaysafe webhook not configured" },
        { status: 500 }
      );
    }

    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Signature is in X-Signature header
    const receivedSignature = request.headers.get("X-Signature");

    if (receivedSignature) {
      // 1. Deep sort all keys in the parsed body alphabetically (recursive)
      const deepSort = (obj: any): any => {
        if (typeof obj !== "object" || obj === null) return obj;
        if (Array.isArray(obj)) return obj.map(deepSort);
        return Object.keys(obj).sort().reduce((sorted: any, key: string) => {
          sorted[key] = deepSort(obj[key]);
          return sorted;
        }, {});
      };

      // 2. Stringify the sorted payload
      const payloadString = JSON.stringify(deepSort(body));

      // 3. HMAC-SHA256 with apiSecret + salt, Base64
      const key = apiSecret + salt;
      const computedSignature = crypto
        .createHmac("sha256", key)
        .update(payloadString)
        .digest("base64");

      // 4. Compare
      if (computedSignature !== receivedSignature) {
        console.error("[xpaysafe webhook] Signature mismatch",
          { received: receivedSignature, computed: computedSignature });
        return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
      }
      console.log("[xpaysafe webhook] Signature verified");
    } else {
      console.warn("[xpaysafe webhook] No X-Signature header, processing without verification");
    }

    const payload = body as {
      transactionId?: string;
      orderId?: string;
      order_id?: string;
      status?: string;
      amount?: number;
      currency?: string;
      type?: string;
      utr?: string;
      gateway_ref_id?: string;
      timestamp?: number;
    };

    console.log("[xpaysafe webhook] Received:", JSON.stringify(payload));

    const orderId = payload.orderId ?? payload.order_id;
    const status = (payload.status || "").toUpperCase();

    if (!orderId) {
      return NextResponse.json(
        { message: "Missing orderId in webhook payload" },
        { status: 400 }
      );
    }

    const pool = getPool();

    const pendingResult = await pool.query(
      `SELECT id, user_id, painting_id, painting_name, painting_image_url, amount_inr, status
       FROM pending_payments WHERE order_id = $1`,
      [orderId]
    );

    if (pendingResult.rows.length === 0) {
      return NextResponse.json(
        { message: "Unknown orderId" },
        { status: 404 }
      );
    }

    const pending = pendingResult.rows[0];
    if (pending.status !== "PENDING") {
      return NextResponse.json({
        success: true,
        message: "Order already processed",
        orderId,
      });
    }

    if (status !== "SUCCESS") {
      await pool.query(
        `UPDATE pending_payments SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE order_id = $2`,
        [status === "FAILED" || status === "EXPIRED" ? status : "PENDING", orderId]
      );
      return NextResponse.json({
        success: true,
        message: `Status ${status} recorded`,
        orderId,
      });
    }

    const userIdDb = pending.user_id;
    const paintingId = pending.painting_id;
    const paintingName = pending.painting_name;
    const paintingImageUrl = pending.painting_image_url;
    const amount = parseFloat(pending.amount_inr);

    const balanceResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as balance
       FROM wallet_transactions WHERE user_id = $1`,
      [userIdDb]
    );
    const balance = parseFloat(balanceResult.rows[0].balance) || 0;
    const newBalance = balance + amount;

    const depositDescription = `Free points (wagering) - Purchase: ${paintingName} (Rs. ${amount.toLocaleString("en-IN")})`;

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
  } catch (error: any) {
    console.error("xpaysafe webhook error:", error);
    return NextResponse.json(
      { message: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}

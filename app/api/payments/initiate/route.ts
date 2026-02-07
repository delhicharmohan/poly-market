import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { createPayin } from "@/lib/xpaysafe";

function getUserId(request: NextRequest): string | null {
  return request.headers.get("X-User-ID");
}

/** xpaysafe expects orderId like "ORDER-123" - short numeric id, unique per request. No special chars. */
function generateOrderId(): string {
  const timePart = Math.floor(Date.now() / 1000) % 1000000; // last 6 digits of unix sec
  const randomPart = Math.floor(Math.random() * 10000) + 1;
  return `ORDER-${timePart}${randomPart}`;
}

/** Strip special characters so payload is safe for gateway. Only letters, digits, space, hyphen, apostrophe. */
function sanitizeName(name: string): string {
  const s = String(name || "")
    .replace(/[^\w\s\-']/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s || "Customer";
}

/** Keep only characters valid in a typical email. */
function sanitizeEmail(email: string): string {
  const s = String(email || "").replace(/[^\w@.\-+]/g, "").trim();
  return s || "customer@example.com";
}

/** Digits only, max 15. */
function sanitizePhone(phone: string): string {
  const s = String(phone || "").replace(/\D/g, "").slice(0, 15);
  return s.length >= 10 ? s : "9999999999";
}

/**
 * Initiate xpaysafe payin for a painting purchase.
 * Creates a pending payment record and returns redirectUrl to send the user to the gateway.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { paintingId, paintingName, paintingImageUrl, amountInr } = body;

    if (!paintingId || !paintingName || amountInr == null || amountInr <= 0) {
      return NextResponse.json(
        { message: "Missing or invalid: paintingId, paintingName, amountInr" },
        { status: 400 }
      );
    }

    const pool = getPool();
    const userResult = await pool.query(
      "SELECT id, email, display_name FROM users WHERE firebase_uid = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const userIdDb = userResult.rows[0].id;
    const userEmail = userResult.rows[0].email || "";
    const displayName = userResult.rows[0].display_name || "Customer";

    const amount = parseFloat(String(amountInr));
    const orderId = generateOrderId();
    const timestamp = Math.floor(Date.now() / 1000);
    if (process.env.NODE_ENV === "development") {
      const tsDate = new Date(timestamp * 1000).toISOString();
      console.log("[xpaysafe] orderId:", orderId, "| timestamp:", timestamp, "| date:", tsDate);
    }

    await pool.query(
      `INSERT INTO pending_payments (order_id, user_id, painting_id, painting_name, painting_image_url, amount_inr, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'INR', 'PENDING')`,
      [
        orderId,
        userIdDb,
        paintingId,
        paintingName,
        paintingImageUrl || null,
        amount,
      ]
    );

    const customerName = sanitizeName(displayName);
    const customerEmail = sanitizeEmail(userEmail);
    const customerPhone = sanitizePhone("9999999999");

    let payinResponse;
    try {
      payinResponse = await createPayin({
        orderId,
        amount: Math.round(amount * 100) / 100, // ensure max 2 decimal places
        currency: "INR",
        customer_details: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        },
        timestamp,
      });
    } catch (payinError: any) {
      await pool.query(
        `UPDATE pending_payments SET status = 'FAILED', completed_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
        [orderId]
      );
      throw payinError;
    }

    const txnId = payinResponse.transactionId;
    if (txnId) {
      await pool.query(
        "UPDATE pending_payments SET gateway_transaction_id = $1 WHERE order_id = $2",
        [txnId, orderId]
      );
    }

    const paymentLink = payinResponse.paymentLink || payinResponse.redirectUrl;
    const upiLink = payinResponse.upiLink;
    if (!paymentLink && !upiLink) {
      return NextResponse.json(
        { message: payinResponse.message || "Payment initiation failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      redirectUrl: paymentLink || upiLink,
      paymentLink: paymentLink || undefined,
      upiLink: upiLink || undefined,
      transactionId: payinResponse.transactionId,
      orderId,
      status: payinResponse.status || "PENDING",
    });
  } catch (error: any) {
    console.error("Payment initiate error:", error);
    const message = error.message || "Failed to initiate payment";
    const isValidation = /validation/i.test(message);
    return NextResponse.json(
      {
        message,
        ...(isValidation && process.env.NODE_ENV === "development"
          ? { hint: "Check server terminal for '[xpaysafe] payin error' to see full response from gateway." }
          : {}),
      },
      { status: isValidation ? 400 : 500 }
    );
  }
}

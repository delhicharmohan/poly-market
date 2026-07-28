import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { createPayin } from "@/lib/xpaysafe";
import { createP2PPayin } from "@/lib/p2p-gateway";

function getUserId(request: NextRequest): string | null {
  return request.headers.get("X-User-ID");
}

/** Generate a short numeric id, unique per request. */
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
 * Initiate payment for a painting purchase.
 * Supports standard gateway (xpaysafe) and p2p.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { paintingId, paintingName, paintingImageUrl, amountInr, gateway } = body;

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

    // Save pending payment record
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

    // Query default payin gateway from database configuration if set
    let selectedGateway = gateway;
    try {
      const gatewaySettingResult = await pool.query(
        "SELECT value FROM gateway_settings WHERE key = 'payin_gateway'"
      );
      if (gatewaySettingResult.rows.length > 0) {
        selectedGateway = gatewaySettingResult.rows[0].value;
      }
    } catch (dbErr) {
      console.error("Failed to query payin_gateway setting, using parameter fallback:", dbErr);
    }

    // Route based on resolved gateway
    if (selectedGateway === "p2p") {
      if (process.env.NODE_ENV === "development") {
        console.log("[P2P Payin] orderId:", orderId, "| amount:", amount);
      }

      // Hosted page return url
      const origin = request.headers.get("origin") || "https://poly-market.onrender.com";
      const returnUrl = `${origin}/merchandise/success?orderId=${orderId}`;

      try {
        const payinResponse = await createP2PPayin({
          amountInr: amount,
          externalRef: orderId,
          returnUrl,
          metadata: {
            customer_name: customerName,
            customer_email: customerEmail,
            painting_id: paintingId,
          },
        });

        if (payinResponse.txn_id) {
          await pool.query(
            "UPDATE pending_payments SET gateway_transaction_id = $1 WHERE order_id = $2",
            [payinResponse.txn_id, orderId]
          );
        }

        return NextResponse.json({
          success: true,
          redirectUrl: payinResponse.checkout_url,
          transactionId: payinResponse.txn_id,
          orderId,
          status: payinResponse.status || "created",
        });
      } catch (p2pError: any) {
        await pool.query(
          `UPDATE pending_payments SET status = 'FAILED', completed_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
          [orderId]
        );
        throw p2pError;
      }
    } else {
      // Default to xpaysafe
      if (process.env.NODE_ENV === "development") {
        const tsDate = new Date(timestamp * 1000).toISOString();
        console.log("[xpaysafe] orderId:", orderId, "| timestamp:", timestamp, "| date:", tsDate);
      }

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
    }
  } catch (error: any) {
    console.error("Payment initiate error:", error);
    const message = error.message || "Failed to initiate payment";
    const isValidation = /validation/i.test(message);
    return NextResponse.json(
      {
        message,
        ...(isValidation && process.env.NODE_ENV === "development"
          ? { hint: "Check server logs for details." }
          : {}),
      },
      { status: isValidation ? 400 : 500 }
    );
  }
}

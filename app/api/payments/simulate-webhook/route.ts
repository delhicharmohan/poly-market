import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, status, utr, amount } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: "Missing orderId or status" }, { status: 400 });
    }

    const webhookSecret = process.env.P2P_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "P2P_WEBHOOK_SECRET is not configured" }, { status: 500 });
    }

    // Standard platform payload format
    const payload = {
      event: status.toUpperCase() === "APPROVED" ? "payin.approved" : "payin.declined",
      id: `evt_sim_${crypto.randomBytes(8).toString("hex")}`,
      created: new Date().toISOString(),
      data: {
        payin_id: `pay_sim_${crypto.randomBytes(8).toString("hex")}`,
        external_ref: orderId,
        amount_paise: Math.round((amount || 150) * 100),
        status: status.toLowerCase(),
        approved_at: new Date().toISOString(),
        utr: utr || "111112345678",
      },
    };

    const timestamp = Math.floor(Date.now() / 1000);
    const rawBody = JSON.stringify(payload);
    const signedPayload = `${timestamp}.${rawBody}`;
    const signatureHash = crypto
      .createHmac("sha256", webhookSecret)
      .update(signedPayload)
      .digest("hex");

    const signatureHeader = `t=${timestamp},v1=${signatureHash}`;

    // Target the locally running webhook endpoint (or via ngrok if preferred)
    // We default to local port 3000. In development we connect directly.
    const origin = request.headers.get("origin") || "http://localhost:3000";
    const webhookUrl = `${origin}/api/webhooks/p2p`;

    console.log(`[P2P Simulator] Routing simulated webhook to: ${webhookUrl}`);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": signatureHeader,
      },
      body: rawBody,
    });

    const rawResponse = await res.text();
    let resData: any = {};
    try {
      resData = rawResponse ? JSON.parse(rawResponse) : {};
    } catch {
      resData = { message: rawResponse };
    }

    return NextResponse.json({
      success: res.ok,
      status: res.status,
      data: resData,
      webhookUrl,
    });
  } catch (error: any) {
    console.error("[P2P Simulator Error]:", error);
    return NextResponse.json({ error: error.message || "Simulation trigger failed" }, { status: 500 });
  }
}

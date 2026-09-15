import crypto from "crypto";



export interface P2PPayinParams {
  amountInr: number;
  customerId: string;
  externalRef: string;
  returnUrl: string;
  customerName?: string;
  customerEmail?: string;
  metadata?: Record<string, any>;
}

export interface P2PPayinResponse {
  txn_id: string;
  checkout_url: string;
  expires_at: string;
  status: string;
}

export interface P2PPayoutParams {
  amountInr: number;
  externalRef: string;
  beneficiary: {
    vpa?: string;
    account_number?: string;
    ifsc?: string;
    name?: string;
  };
  payoutMode?: "upi" | "imps" | "neft";
  metadata?: Record<string, any>;
}

export interface P2PPayoutResponse {
  txn_id: string;
  status: string;
  expires_at: string;
}

/**
 * Get credentials and configuration from env vars.
 */
function getP2PConfig() {
  const apiKey = process.env.P2P_API_KEY;
  const webhookSecret = process.env.P2P_WEBHOOK_SECRET;
  const baseUrl = (process.env.P2P_BASE_URL || "").replace(/\/$/, "");

  if (!apiKey || !webhookSecret || !baseUrl) {
    throw new Error("P2P environment variables P2P_API_KEY, P2P_WEBHOOK_SECRET, and P2P_BASE_URL must be defined");
  }

  return { apiKey, webhookSecret, baseUrl };
}

/**
 * Verify Webhook signature sent by P2P Platform.
 * Header: X-Signature: t=1721295262,v1=hash...
 */
export function verifyP2PWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string
): boolean {
  if (!signatureHeader) return false;

  const parts: Record<string, string> = {};
  signatureHeader.split(",").forEach((pair) => {
    const [key, value] = pair.split("=");
    if (key && value) parts[key.trim()] = value.trim();
  });

  const timestamp = parts["t"];
  const signatureHash = parts["v1"];

  if (!timestamp || !signatureHash) return false;

  // 1. Replay attack check (5 minutes threshold)
  const now = Math.floor(Date.now() / 1000);
  const timeDifference = Math.abs(now - parseInt(timestamp, 10));
  if (timeDifference > 300) {
    console.error("[P2P Webhook] Signature expired. Difference (s):", timeDifference);
    return false;
  }

  // 2. Validate HMAC hash
  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedHash = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHash, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Initialize a Payin (Collection) Order on P2P Platform.
 */
export async function createP2PPayin(params: P2PPayinParams): Promise<P2PPayinResponse> {
  const { apiKey, baseUrl } = getP2PConfig();
  const idempotencyKey = crypto.randomUUID();

  // Convert INR amount to paise (integer)
  const amountPaise = Math.round(params.amountInr * 100);

  const payload = {
    amount_paise: amountPaise,
    currency: "INR",
    customer_id: params.customerId,
    external_ref: params.externalRef,
    customer_name: params.customerName,
    customer_email: params.customerEmail,
    return_url: params.returnUrl,
    metadata: params.metadata,
  };

  const url = `${baseUrl}/payins`;
  if (process.env.NODE_ENV === "development") {
    console.log("[P2P Payin] Request payload:", JSON.stringify(payload));
  }



  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  let data: any = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new Error(`P2P Payin response parse error: ${rawText}`);
  }

  if (!res.ok) {
    console.error("[P2P Payin] Request failed:", res.status, data);
    throw new Error(data.message || data.error || `P2P Payin failed: ${res.status}`);
  }

  // Rewrite checkout_url if it incorrectly points to localhost/127.0.0.1 or is relative
  if (data.checkout_url) {
    try {
      const urlObj = new URL(data.checkout_url, "https://p2p-upi-aggregator.onrender.com");
      if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
        urlObj.protocol = "https:";
        urlObj.host = "p2p-upi-aggregator.onrender.com";
        urlObj.port = ""; // Strip port number since Render exposes standard 443 externally
        data.checkout_url = urlObj.toString();
        console.log("[P2P Payin] Rewrote localhost checkout URL to Render (stripped port):", data.checkout_url);
      }
    } catch (e) {
      console.error("[P2P Payin] Failed to parse or rewrite checkout URL:", e);
    }
  }

  return data as P2PPayinResponse;
}

/**
 * Initialize a Payout (Disbursement) on P2P Platform.
 */
export async function createP2PPayout(params: P2PPayoutParams): Promise<P2PPayoutResponse> {
  const { apiKey, baseUrl } = getP2PConfig();
  const idempotencyKey = crypto.randomUUID();

  const amountPaise = Math.round(params.amountInr * 100);

  const payload = {
    amount_paise: amountPaise,
    currency: "INR",
    external_ref: params.externalRef,
    payout_mode: params.payoutMode || "upi",
    beneficiary: params.beneficiary,
    metadata: params.metadata,
  };

  const url = `${baseUrl}/payouts`;
  if (process.env.NODE_ENV === "development") {
    console.log("[P2P Payout] Request payload:", JSON.stringify(payload));
  }



  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  let data: any = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new Error(`P2P Payout response parse error: ${rawText}`);
  }

  if (!res.ok) {
    console.error("[P2P Payout] Request failed:", res.status, data);
    throw new Error(data.message || data.error || `P2P Payout failed: ${res.status}`);
  }

  return data as P2PPayoutResponse;
}

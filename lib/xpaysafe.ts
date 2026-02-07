import crypto from "crypto";

const DEFAULT_BASE_URL = "https://api.xpaysafe.com";

/** Recursive deep sort – matches Postman collection exactly (all keys at all levels sorted). */
function deepSort<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(deepSort) as T;
  return Object.keys(obj as Record<string, unknown>)
    .sort()
    .reduce((acc, key) => {
      (acc as Record<string, unknown>)[key] = deepSort((obj as Record<string, unknown>)[key]);
      return acc;
    }, {} as Record<string, unknown>) as T;
}

/** Build JSON string for signing: recursive deep sort (Postman collection). */
export function getSignedPayloadString(payload: object): string {
  return JSON.stringify(deepSort(payload as Record<string, unknown>));
}

/** Signature encoding: set XPAYSAFE_SIGNATURE_ENCODING=hex to use hex; default is base64 (Postman). */
function getSignatureEncoding(): "base64" | "hex" {
  const enc = (process.env.XPAYSAFE_SIGNATURE_ENCODING || "base64").toLowerCase();
  return enc === "hex" ? "hex" : "base64";
}

/** Key for HMAC: default apiSecret+salt. Set XPAYSAFE_KEY_ORDER=salt_first for salt+apiSecret. */
function getHmacKey(apiSecret: string, salt: string): string {
  return (process.env.XPAYSAFE_KEY_ORDER || "").toLowerCase() === "salt_first"
    ? salt + apiSecret
    : apiSecret + salt;
}

/** Sign an exact string (the request body). Use this so we sign exactly what we send. */
function signPayloadRaw(
  payloadString: string,
  apiSecret: string,
  salt: string
): string {
  const key = getHmacKey(apiSecret, salt);
  const encoding = getSignatureEncoding();
  return crypto.createHmac("sha256", key).update(payloadString).digest(encoding);
}

/**
 * Generate X-Signature for xpaysafe API (given an object; sorts and stringifies then signs).
 * Default: HMAC-SHA256 with API_SECRET + SALT, Base64 (Postman). Use XPAYSAFE_SIGNATURE_ENCODING=hex for hex.
 */
export function signPayload(
  payload: object,
  apiSecret: string,
  salt: string
): string {
  const payloadString = getSignedPayloadString(payload);
  return signPayloadRaw(payloadString, apiSecret, salt);
}

/** Verify webhook signature (Base64 HMAC, same as request signing). */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  apiSecret: string,
  salt: string
): boolean {
  if (!signature) return false;
  const key = apiSecret + salt;
  const expected = crypto.createHmac("sha256", key).update(rawBody).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, "base64"), Buffer.from(expected, "base64"));
  } catch {
    return false;
  }
}

export interface PayinCustomerDetails {
  name: string;
  email: string;
  phone: string;
}

export interface PayinParams {
  orderId: string;
  amount: number;
  currency: string;
  customer_details: PayinCustomerDetails;
  timestamp: number;
}

export interface PayinResponse {
  success?: boolean;
  message?: string;
  transactionId?: string;
  status?: string;
  redirectUrl?: string;
  /** Normalized from API (payment_link / redirect_url). */
  paymentLink?: string;
  /** From API data.raw_response.data.upi_link. */
  upiLink?: string;
  /** Postman example: redirectUrl can be inside data.redirect_url or data.raw_response.data.payment_link / upi_link */
  data?: {
    redirect_url?: string;
    raw_response?: {
      data?: { payment_link?: string; upi_link?: string };
    };
  };
}

/**
 * Call xpaysafe Payin API. Returns redirectUrl for the customer to complete payment.
 */
export async function createPayin(params: PayinParams): Promise<PayinResponse> {
  const apiKey = process.env.XPAYSAFE_API_KEY;
  const apiSecret = process.env.XPAYSAFE_API_SECRET;
  const salt = process.env.XPAYSAFE_SALT;
  const baseUrl = (process.env.XPAYSAFE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");

  if (!apiKey || !apiSecret || !salt) {
    throw new Error("xpaysafe: XPAYSAFE_API_KEY, XPAYSAFE_API_SECRET, and XPAYSAFE_SALT must be set");
  }

  // Request body: orderId, amount, currency, customer_details only (no timestamp – Postman sends timestamp only in header)
  const bodyWithoutTimestamp = {
    orderId: params.orderId,
    amount: params.amount,
    currency: params.currency,
    customer_details: {
      name: params.customer_details.name,
      email: params.customer_details.email,
      phone: params.customer_details.phone,
    },
  };

  // Sign payload = body + timestamp (number), then recursive deep sort – matches Postman exactly
  const payloadToSign = { ...bodyWithoutTimestamp, timestamp: params.timestamp };
  const payloadString = getSignedPayloadString(payloadToSign);
  const signature = signPayloadRaw(payloadString, apiSecret, salt);
  const timestampHeader = params.timestamp.toString();

  // Send body without timestamp (server adds X-Timestamp when verifying)
  const bodyString = JSON.stringify(bodyWithoutTimestamp);

  if (process.env.NODE_ENV === "development") {
    console.log("[xpaysafe] payin request body:", bodyString);
  }

  const res = await fetch(`${baseUrl}/api/v1/transactions/payin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      "X-Signature": signature,
      "X-Timestamp": timestampHeader,
    },
    body: bodyString,
  });

  const rawText = await res.text();
  let data: PayinResponse & {
    error?: string;
    reason?: string;
    errors?: string[] | Record<string, string | string[]>;
    details?: string[] | Record<string, unknown>;
  };
  try {
    data = rawText ? (JSON.parse(rawText) as typeof data) : {};
  } catch {
    data = {};
    if (process.env.NODE_ENV === "development") {
      console.error("[xpaysafe] payin raw response (not JSON):", rawText);
    }
  }

  if (!res.ok) {
    const fullLog = JSON.stringify(data, null, 2);
    console.error("[xpaysafe] payin error", res.status, fullLog);
    const msg = data.message || data.error || data.reason || `xpaysafe payin failed: ${res.status}`;
    const details = formatValidationDetails(data.errors ?? data.details);
    const fullMessage = details ? `${msg}: ${details}` : msg;
    throw new Error(fullMessage);
  }
  if (data.success === false && data.message) {
    const fullLog = JSON.stringify(data, null, 2);
    console.error("[xpaysafe] payin success=false", fullLog);
    const details = formatValidationDetails(data.errors ?? (data as any).details);
    throw new Error(details ? `${data.message}: ${details}` : data.message);
  }

  const paymentLink =
    data.redirectUrl ||
    data.data?.redirect_url ||
    data.data?.raw_response?.data?.payment_link;
  const upiLink = data.data?.raw_response?.data?.upi_link;
  const redirectUrl = paymentLink || upiLink;
  return { ...data, redirectUrl, paymentLink: paymentLink || undefined, upiLink: upiLink || undefined };
}

// ── Payout (Withdrawal) ──

export interface PayoutBeneficiaryDetails {
  name: string;
  accountNumber: string;
  ifsc: string;
  bankName?: string;
  address?: string;
}

export interface PayoutParams {
  orderId: string;
  amount: number;
  currency: string;
  beneficiary_details: PayoutBeneficiaryDetails;
  timestamp: number;
}

export interface PayoutResponse {
  success?: boolean;
  message?: string;
  transactionId?: string;
  status?: string;
}

/**
 * Call xpaysafe Payout API. Initiates a bank transfer to the beneficiary.
 */
export async function createPayout(params: PayoutParams): Promise<PayoutResponse> {
  const apiKey = process.env.XPAYSAFE_API_KEY;
  const apiSecret = process.env.XPAYSAFE_API_SECRET;
  const salt = process.env.XPAYSAFE_SALT;
  const baseUrl = (process.env.XPAYSAFE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");

  if (!apiKey || !apiSecret || !salt) {
    throw new Error("xpaysafe: XPAYSAFE_API_KEY, XPAYSAFE_API_SECRET, and XPAYSAFE_SALT must be set");
  }

  // Request body without timestamp (same pattern as payin)
  const bodyWithoutTimestamp = {
    orderId: params.orderId,
    amount: params.amount,
    currency: params.currency,
    beneficiary_details: {
      name: params.beneficiary_details.name,
      accountNumber: params.beneficiary_details.accountNumber,
      ifsc: params.beneficiary_details.ifsc,
      bankName: params.beneficiary_details.bankName || "Bank",
      address: params.beneficiary_details.address || "India",
    },
  };

  // Sign payload = body + timestamp, deep sorted
  const payloadToSign = { ...bodyWithoutTimestamp, timestamp: params.timestamp };
  const payloadString = getSignedPayloadString(payloadToSign);
  const signature = signPayloadRaw(payloadString, apiSecret, salt);
  const timestampHeader = params.timestamp.toString();

  const bodyString = JSON.stringify(bodyWithoutTimestamp);

  if (process.env.NODE_ENV === "development") {
    console.log("[xpaysafe] payout request body:", bodyString);
  }

  const res = await fetch(`${baseUrl}/api/v1/transactions/payout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      "X-Signature": signature,
      "X-Timestamp": timestampHeader,
    },
    body: bodyString,
  });

  const rawText = await res.text();
  let data: PayoutResponse & { error?: string; reason?: string; errors?: any; details?: any };
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = {};
    if (process.env.NODE_ENV === "development") {
      console.error("[xpaysafe] payout raw response (not JSON):", rawText);
    }
  }

  if (!res.ok) {
    const fullLog = JSON.stringify(data, null, 2);
    console.error("[xpaysafe] payout error", res.status, fullLog);
    const msg = data.message || data.error || data.reason || `xpaysafe payout failed: ${res.status}`;
    const details = formatValidationDetails(data.errors ?? data.details);
    throw new Error(details ? `${msg}: ${details}` : msg);
  }
  if (data.success === false && data.message) {
    throw new Error(data.message);
  }
  return data;
}

function formatValidationDetails(
  errors: string[] | Record<string, string | string[] | unknown> | undefined
): string {
  if (!errors) return "";
  if (Array.isArray(errors)) return errors.join("; ");
  const parts = Object.entries(errors).map(([k, v]) =>
    Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${v}`
  );
  return parts.join("; ");
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";

const mockQuery = vi.fn();
vi.mock("@/lib/db", () => ({
  getPool: () => ({ query: mockQuery }),
}));

vi.mock("@/lib/send-sale-email", () => ({
  sendSaleEmailWithAttachments: vi.fn().mockResolvedValue({ ok: true }),
}));

import { POST } from "@/app/api/webhooks/xpaysafe/route";

const API_SECRET = "test-api-secret";
const SALT = "test-salt";

function deepSort(obj: any): any {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(deepSort);
  return Object.keys(obj).sort().reduce((sorted: any, key: string) => {
    sorted[key] = deepSort(obj[key]);
    return sorted;
  }, {});
}

function signBody(body: object): string {
  const sorted = JSON.stringify(deepSort(body));
  const key = API_SECRET + SALT;
  return crypto.createHmac("sha256", key).update(sorted).digest("base64");
}

function makeRequest(body: object, signature?: string): NextRequest {
  const rawBody = JSON.stringify(body);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (signature !== undefined) {
    headers["X-Signature"] = signature;
  }
  return new NextRequest("http://localhost:3000/api/webhooks/xpaysafe", {
    method: "POST",
    headers,
    body: rawBody,
  });
}

describe("POST /api/webhooks/xpaysafe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.XPAYSAFE_API_SECRET = API_SECRET;
    process.env.XPAYSAFE_SALT = SALT;
  });

  it("returns 500 when API secret/salt is not configured", async () => {
    delete process.env.XPAYSAFE_API_SECRET;
    const req = makeRequest({ orderId: "ORDER-1", status: "SUCCESS" });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("returns 401 for invalid signature", async () => {
    const body = { orderId: "ORDER-1", status: "SUCCESS" };
    const req = makeRequest(body, "bad-signature");
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when orderId is missing", async () => {
    const body = { status: "SUCCESS" };
    const sig = signBody(body);
    const req = makeRequest(body, sig);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/Missing orderId/i);
  });

  // ── PAYIN callbacks ──

  it("returns 404 for unknown payin orderId", async () => {
    const body = { orderId: "ORDER-999", status: "SUCCESS" };
    const sig = signBody(body);
    const req = makeRequest(body, sig);
    mockQuery.mockResolvedValueOnce({ rows: [] }); // pending_payments lookup
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns success when payin order is already processed", async () => {
    const body = { orderId: "ORDER-1", status: "SUCCESS" };
    const sig = signBody(body);
    const req = makeRequest(body, sig);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, user_id: 10, painting_id: "p1", painting_name: "Art", painting_image_url: null, amount_inr: "500", status: "SUCCESS" }],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toMatch(/already processed/i);
  });

  it("records non-SUCCESS status for payin without creating sale", async () => {
    const body = { orderId: "ORDER-1", status: "FAILED" };
    const sig = signBody(body);
    const req = makeRequest(body, sig);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, user_id: 10, painting_id: "p1", painting_name: "Art", painting_image_url: null, amount_inr: "500", status: "PENDING" }],
    });
    mockQuery.mockResolvedValueOnce({}); // update pending_payments
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toMatch(/FAILED/i);
  });

  it("processes successful payin: wallet credit + sale + email", async () => {
    const body = { orderId: "ORDER-1", status: "SUCCESS" };
    const sig = signBody(body);
    const req = makeRequest(body, sig);

    // pending_payments lookup
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, user_id: 10, painting_id: "p1", painting_name: "Sunset",
        painting_image_url: "https://img.test/sunset.jpg", amount_inr: "1000", status: "PENDING",
      }],
    });
    // wallet balance
    mockQuery.mockResolvedValueOnce({ rows: [{ balance: "500" }] });
    // wallet transaction insert
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 42 }] });
    // sale insert
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 7, invoice_number: "INV-TEST" }] });
    // pending_payments update
    mockQuery.mockResolvedValueOnce({});
    // user email lookup
    mockQuery.mockResolvedValueOnce({ rows: [{ email: "user@test.com" }] });
    // email_sent_at update
    mockQuery.mockResolvedValueOnce({});

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.invoiceNumber).toBe("INV-TEST");

    // Verify email was sent
    const { sendSaleEmailWithAttachments } = await import("@/lib/send-sale-email");
    expect(sendSaleEmailWithAttachments).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@test.com",
        paintingName: "Sunset",
        amountInr: 1000,
      })
    );
  });

  // ── PAYOUT callbacks ──

  it("returns 404 for unknown payout orderId", async () => {
    const body = { orderId: "PAYOUT-999", status: "SUCCESS" };
    const sig = signBody(body);
    const req = makeRequest(body, sig);
    mockQuery.mockResolvedValueOnce({ rows: [] }); // pending_payouts lookup
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns success for already-processed payout", async () => {
    const body = { orderId: "PAYOUT-1", status: "SUCCESS" };
    const sig = signBody(body);
    const req = makeRequest(body, sig);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, user_id: 10, amount_inr: "200", wallet_transaction_id: 42, status: "SUCCESS" }],
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.message).toMatch(/already processed/i);
  });

  it("confirms successful payout", async () => {
    const body = { orderId: "PAYOUT-1", status: "SUCCESS" };
    const sig = signBody(body);
    const req = makeRequest(body, sig);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, user_id: 10, amount_inr: "200", wallet_transaction_id: 42, status: "PENDING" }],
    });
    mockQuery.mockResolvedValueOnce({}); // update status
    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/confirmed/i);
  });

  it("refunds wallet on failed payout", async () => {
    const body = { orderId: "PAYOUT-1", status: "FAILED" };
    const sig = signBody(body);
    const req = makeRequest(body, sig);

    // pending_payouts lookup
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, user_id: 10, amount_inr: "200", wallet_transaction_id: 42, status: "PENDING" }],
    });
    // idempotency check for refund
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // balance query
    mockQuery.mockResolvedValueOnce({ rows: [{ balance: "300" }] });
    // refund insert
    mockQuery.mockResolvedValueOnce({});
    // update payout status
    mockQuery.mockResolvedValueOnce({});

    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/refunded/i);
    expect(data.refundedAmount).toBe(200);
  });

  it("handles payout refund idempotency (already refunded)", async () => {
    const body = { orderId: "PAYOUT-1", status: "FAILED" };
    const sig = signBody(body);
    const req = makeRequest(body, sig);

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, user_id: 10, amount_inr: "200", wallet_transaction_id: 42, status: "PENDING" }],
    });
    // Idempotency: refund already exists
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 99 }] });
    mockQuery.mockResolvedValueOnce({}); // update status

    const res = await POST(req);
    const data = await res.json();
    expect(data.message).toMatch(/already refunded/i);
  });

  it("processes without signature when none provided", async () => {
    const body = { orderId: "ORDER-1", status: "SUCCESS" };
    const req = makeRequest(body); // no signature
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, user_id: 10, painting_id: "p1", painting_name: "Art",
        painting_image_url: null, amount_inr: "100", status: "PENDING",
      }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [{ balance: "0" }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, invoice_number: "INV-1" }] });
    mockQuery.mockResolvedValueOnce({});
    mockQuery.mockResolvedValueOnce({ rows: [{ email: "a@b.com" }] });
    mockQuery.mockResolvedValueOnce({});

    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

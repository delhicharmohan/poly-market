import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockQuery = vi.fn();
vi.mock("@/lib/db", () => ({
  getPool: () => ({ query: mockQuery }),
}));

const mockCreatePayin = vi.fn();
vi.mock("@/lib/xpaysafe", () => ({
  createPayin: (...args: any[]) => mockCreatePayin(...args),
}));

import { POST } from "@/app/api/payments/initiate/route";

function makeRequest(body: object, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/payments/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/payments/initiate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when X-User-ID header is missing", async () => {
    const req = makeRequest({ paintingId: "p1", paintingName: "Art", amountInr: 100 });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when paintingId is missing", async () => {
    const req = makeRequest(
      { paintingName: "Art", amountInr: 100 },
      { "X-User-ID": "uid-1" }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/Missing or invalid/i);
  });

  it("returns 400 when amountInr is 0", async () => {
    const req = makeRequest(
      { paintingId: "p1", paintingName: "Art", amountInr: 0 },
      { "X-User-ID": "uid-1" }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when amountInr is negative", async () => {
    const req = makeRequest(
      { paintingId: "p1", paintingName: "Art", amountInr: -50 },
      { "X-User-ID": "uid-1" }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when user is not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // user lookup
    const req = makeRequest(
      { paintingId: "p1", paintingName: "Art", amountInr: 100 },
      { "X-User-ID": "uid-1" }
    );
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 502 when gateway returns no payment link", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, email: "a@b.com", display_name: "User" }] })
      .mockResolvedValueOnce({}); // pending_payments insert

    mockCreatePayin.mockResolvedValueOnce({
      message: "No payment link",
      // No redirectUrl, paymentLink, or upiLink
    });

    const req = makeRequest(
      { paintingId: "p1", paintingName: "Art", amountInr: 500 },
      { "X-User-ID": "uid-1" }
    );
    const res = await POST(req);
    expect(res.status).toBe(502);
  });

  it("returns success with payment link on successful initiation", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, email: "test@test.com", display_name: "Test User" }] })
      .mockResolvedValueOnce({}) // pending_payments insert
      .mockResolvedValueOnce({}); // gateway txn update

    mockCreatePayin.mockResolvedValueOnce({
      transactionId: "txn-123",
      paymentLink: "https://pay.gateway.com/checkout/abc",
      status: "PENDING",
    });

    const req = makeRequest(
      { paintingId: "p1", paintingName: "Sunset Art", amountInr: 500 },
      { "X-User-ID": "uid-1" }
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.redirectUrl).toBe("https://pay.gateway.com/checkout/abc");
    expect(data.orderId).toMatch(/^ORDER-/);
  });

  it("marks payment as FAILED when createPayin throws", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, email: "a@b.com", display_name: "User" }] })
      .mockResolvedValueOnce({}) // pending_payments insert
      .mockResolvedValueOnce({}); // update to FAILED

    mockCreatePayin.mockRejectedValueOnce(new Error("Gateway timeout"));

    const req = makeRequest(
      { paintingId: "p1", paintingName: "Art", amountInr: 500 },
      { "X-User-ID": "uid-1" }
    );
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.message).toMatch(/Gateway timeout/i);
  });

  it("sanitizes customer details before calling gateway", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, email: "test@test.com", display_name: "User <script>" }] })
      .mockResolvedValueOnce({}) // pending_payments insert
      .mockResolvedValueOnce({}); // txn update

    mockCreatePayin.mockResolvedValueOnce({
      transactionId: "txn-1",
      paymentLink: "https://pay.test/checkout",
    });

    const req = makeRequest(
      { paintingId: "p1", paintingName: "Art", amountInr: 100 },
      { "X-User-ID": "uid-1" }
    );
    await POST(req);

    expect(mockCreatePayin).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_details: expect.objectContaining({
          name: expect.not.stringContaining("<script>"),
        }),
      })
    );
  });
});

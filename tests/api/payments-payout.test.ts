import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockQuery = vi.fn();
vi.mock("@/lib/db", () => ({
  getPool: () => ({ query: mockQuery }),
}));

const mockCreatePayout = vi.fn();
vi.mock("@/lib/xpaysafe", () => ({
  createPayout: (...args: any[]) => mockCreatePayout(...args),
}));

import { POST } from "@/app/api/payments/payout/route";

function makeRequest(body: object, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/payments/payout", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validBody = {
  amount: 500,
  accountNumber: "1234567890",
  ifsc: "SBIN0001234",
  beneficiaryName: "John Doe",
};

describe("POST /api/payments/payout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when X-User-ID is missing", async () => {
    const req = makeRequest(validBody);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when amount is 0", async () => {
    const req = makeRequest({ ...validBody, amount: 0 }, { "X-User-ID": "uid-1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/greater than 0/i);
  });

  it("returns 400 when amount is negative", async () => {
    const req = makeRequest({ ...validBody, amount: -100 }, { "X-User-ID": "uid-1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when accountNumber is missing", async () => {
    const { accountNumber, ...noAccount } = validBody;
    const req = makeRequest(noAccount, { "X-User-ID": "uid-1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/Missing required/i);
  });

  it("returns 400 when ifsc is missing", async () => {
    const { ifsc, ...noIfsc } = validBody;
    const req = makeRequest(noIfsc, { "X-User-ID": "uid-1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when beneficiaryName is missing", async () => {
    const { beneficiaryName, ...noName } = validBody;
    const req = makeRequest(noName, { "X-User-ID": "uid-1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when user not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // user lookup
    const req = makeRequest(validBody, { "X-User-ID": "uid-1" });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 400 when user has insufficient balance", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, email: "a@b.com", display_name: "User" }] })
      .mockResolvedValueOnce({ rows: [{ balance: "100.00" }] }); // balance < amount
    const req = makeRequest(validBody, { "X-User-ID": "uid-1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/Insufficient balance/i);
  });

  it("returns success on successful payout", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, email: "a@b.com", display_name: "User" }] })
      .mockResolvedValueOnce({ rows: [{ balance: "1000.00" }] }) // enough balance
      .mockResolvedValueOnce({ rows: [{ id: 42 }] }); // wallet tx insert

    mockCreatePayout.mockResolvedValueOnce({
      transactionId: "payout-txn-1",
      status: "PENDING",
    });

    mockQuery.mockResolvedValueOnce({}); // pending_payouts insert

    const req = makeRequest(validBody, { "X-User-ID": "uid-1" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.orderId).toMatch(/^PAYOUT-/);
    expect(data.balance).toBe(500); // 1000 - 500
  });

  it("refunds wallet when gateway API call fails", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, email: "a@b.com", display_name: "User" }] })
      .mockResolvedValueOnce({ rows: [{ balance: "1000.00" }] })
      .mockResolvedValueOnce({ rows: [{ id: 42 }] }); // wallet tx insert (deduction)

    mockCreatePayout.mockRejectedValueOnce(new Error("Gateway error"));

    mockQuery.mockResolvedValueOnce({}); // refund insert

    const req = makeRequest(validBody, { "X-User-ID": "uid-1" });
    const res = await POST(req);
    expect(res.status).toBe(500);

    // Verify refund was issued — description is in params, not SQL string
    const refundCall = mockQuery.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === "string" &&
        call[0].includes("INSERT INTO wallet_transactions") &&
        Array.isArray(call[1]) &&
        call[1].some((param: any) => typeof param === "string" && param.includes("Payout failed"))
    );
    expect(refundCall).toBeDefined();
  });

  it("still succeeds even if pending_payouts tracking insert fails", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, email: "a@b.com", display_name: "User" }] })
      .mockResolvedValueOnce({ rows: [{ balance: "1000.00" }] })
      .mockResolvedValueOnce({ rows: [{ id: 42 }] });

    mockCreatePayout.mockResolvedValueOnce({
      transactionId: "payout-txn-1",
      status: "PENDING",
    });

    // pending_payouts insert fails (non-fatal)
    mockQuery.mockRejectedValueOnce(new Error("DB insert error"));

    const req = makeRequest(validBody, { "X-User-ID": "uid-1" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

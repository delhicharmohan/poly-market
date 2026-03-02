import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Create mock pool with chainable query
const mockQuery = vi.fn();
vi.mock("@/lib/db", () => ({
  getPool: () => ({ query: mockQuery }),
}));

// Mock axios
vi.mock("axios", () => ({
  default: { post: vi.fn() },
}));

import axios from "axios";
import { POST } from "@/app/api/wager/route";

describe("POST /api/wager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCHANT_API_KEY = "test-merchant-key";
    process.env.API_BASE_URL = "http://core-api.test/api/v1";
  });

  function makeRequest(body: object, headers: Record<string, string> = {}): NextRequest {
    return new NextRequest("http://localhost:3000/api/wager", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when X-User-ID header is missing", async () => {
    const req = makeRequest({ marketId: "m1", selection: "yes", stake: 10 });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.message).toMatch(/Missing User ID/i);
  });

  it("returns 500 when MERCHANT_API_KEY is not set", async () => {
    delete process.env.MERCHANT_API_KEY;
    const req = makeRequest(
      { marketId: "m1", selection: "yes", stake: 10 },
      { "X-User-ID": "uid-1" }
    );
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.message).toMatch(/API key not configured/i);
  });

  it("returns 400 for invalid stake (zero)", async () => {
    const req = makeRequest(
      { marketId: "m1", selection: "yes", stake: 0 },
      { "X-User-ID": "uid-1" }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/Invalid stake/i);
  });

  it("returns 400 for negative stake", async () => {
    const req = makeRequest(
      { marketId: "m1", selection: "yes", stake: -5 },
      { "X-User-ID": "uid-1" }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/Invalid stake/i);
  });

  it("returns 400 for NaN stake", async () => {
    const req = makeRequest(
      { marketId: "m1", selection: "yes", stake: "abc" },
      { "X-User-ID": "uid-1" }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/Invalid stake/i);
  });

  it("returns 400 when user is not found in database", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // user lookup
    const req = makeRequest(
      { marketId: "m1", selection: "yes", stake: 10 },
      { "X-User-ID": "uid-1" }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/not initialized/i);
  });

  it("returns 400 when user has insufficient balance", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // user lookup
      .mockResolvedValueOnce({ rows: [{ balance: "5.00" }] }); // balance check
    const req = makeRequest(
      { marketId: "m1", selection: "yes", stake: 10 },
      { "X-User-ID": "uid-1" }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/Insufficient balance/i);
  });

  it("returns 201 on successful wager placement", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // user lookup
      .mockResolvedValueOnce({ rows: [{ balance: "100.00" }] }) // balance check
      .mockResolvedValueOnce({ rows: [{ id: 42 }] }) // wallet_transactions insert
    ;

    // Core API success
    (axios.post as any).mockResolvedValueOnce({
      data: {
        wagerId: "wager-123",
        marketId: "m1",
        stake: 10,
        selection: "yes",
        odds: { yes: 1.5, no: 2.5 },
      },
    });

    // Local record-keeping queries
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // market upsert
      .mockResolvedValueOnce({ rows: [{ id: 99 }] }) // wager insert
      .mockResolvedValueOnce({ rows: [] }); // link wallet tx

    const req = makeRequest(
      { marketId: "m1", marketTitle: "Test Market", selection: "yes", stake: 10 },
      { "X-User-ID": "uid-1" }
    );
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.wagerId).toBe("wager-123");
  });

  it("refunds on core API failure after deduction", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // user lookup
      .mockResolvedValueOnce({ rows: [{ balance: "100.00" }] }) // balance check
      .mockResolvedValueOnce({ rows: [{ id: 42 }] }); // wallet tx insert

    // Core API fails
    const apiError: any = new Error("Core API error");
    apiError.response = { status: 500, data: { message: "Internal server error" } };
    (axios.post as any).mockRejectedValueOnce(apiError);

    // Refund queries
    mockQuery
      .mockResolvedValueOnce({ rows: [{ balance: "90.00" }] }) // balance query for refund
      .mockResolvedValueOnce({ rows: [] }); // refund insert

    const req = makeRequest(
      { marketId: "m1", selection: "yes", stake: 10 },
      { "X-User-ID": "uid-1" }
    );
    const res = await POST(req);
    expect(res.status).toBe(500);

    // Verify refund query was called — the description "Refund: ..." is in the params array
    const refundCall = mockQuery.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === "string" &&
        call[0].includes("INSERT INTO wallet_transactions") &&
        Array.isArray(call[1]) &&
        call[1].some((param: any) => typeof param === "string" && param.includes("Refund"))
    );
    expect(refundCall).toBeDefined();
  });

  it("handles network errors (ENOTFOUND)", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ balance: "100.00" }] })
      .mockResolvedValueOnce({ rows: [{ id: 42 }] });

    const netError: any = new Error("getaddrinfo ENOTFOUND");
    netError.code = "ENOTFOUND";
    (axios.post as any).mockRejectedValueOnce(netError);

    // Refund queries
    mockQuery
      .mockResolvedValueOnce({ rows: [{ balance: "90.00" }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = makeRequest(
      { marketId: "m1", selection: "yes", stake: 10 },
      { "X-User-ID": "uid-1" }
    );
    const res = await POST(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.message).toMatch(/Cannot connect/i);
  });
});

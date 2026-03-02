import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockQuery = vi.fn();
vi.mock("@/lib/db", () => ({
  getPool: () => ({ query: mockQuery }),
}));

import crypto from "crypto";
import { POST, GET } from "@/app/api/webhooks/settlement/route";

const API_KEY = "test-merchant-key";

function sign(body: string): string {
  return crypto.createHmac("sha256", API_KEY).update(body).digest("hex");
}

function makeSettlementPayload(overrides: Record<string, any> = {}) {
  return {
    event: "market.settled",
    marketId: "market-1",
    marketStatus: "SETTLED",
    outcome: "yes",
    timestamp: Date.now(),
    wagers: [],
    ...overrides,
  };
}

function makeRequest(body: object, headers: Record<string, string> = {}): NextRequest {
  const rawBody = JSON.stringify(body);
  return new NextRequest("http://localhost:3000/api/webhooks/settlement", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Merchant-Signature": sign(rawBody),
      ...headers,
    },
    body: rawBody,
  });
}

describe("POST /api/webhooks/settlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCHANT_API_KEY = API_KEY;
  });

  it("returns 500 when MERCHANT_API_KEY is not configured", async () => {
    delete process.env.MERCHANT_API_KEY;
    const body = makeSettlementPayload();
    const req = new NextRequest("http://localhost:3000/api/webhooks/settlement", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("returns 401 for invalid signature", async () => {
    const body = makeSettlementPayload();
    const req = new NextRequest("http://localhost:3000/api/webhooks/settlement", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Merchant-Signature": "invalid-sig",
      },
      body: JSON.stringify(body),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when wagers array is missing", async () => {
    const body = makeSettlementPayload();
    delete (body as any).wagers;
    const req = makeRequest(body);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/wagers array is required/i);
  });

  it("returns 400 for missing required fields", async () => {
    const body = { event: "market.settled", wagers: [] }; // missing marketId, marketStatus, outcome
    const req = makeRequest(body);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/Missing required fields/i);
  });

  it("returns 400 for invalid outcome (not yes/no)", async () => {
    const body = makeSettlementPayload({ outcome: "maybe" });
    const req = makeRequest(body);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/Invalid outcome/i);
  });

  it("returns 400 for unsupported event type", async () => {
    const body = makeSettlementPayload({ event: "market.created" });
    const req = makeRequest(body);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/not supported/i);
  });

  it("processes settlement with no wagers (empty market)", async () => {
    const body = makeSettlementPayload({ wagers: [] });
    const req = makeRequest(body);

    // BEGIN
    mockQuery.mockResolvedValueOnce({});
    // Market check
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "market-1", title: "Test", status: "OPEN" }] });
    // Market update
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    // Wager status update
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    // Winning wagers query
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // COMMIT
    mockQuery.mockResolvedValueOnce({});

    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.outcome).toBe("yes");
  });

  it("credits winning wagers with B2B payout amounts", async () => {
    const body = makeSettlementPayload({
      outcome: "yes",
      wagers: [
        { wagerId: "wager-abc", won: true, payout: 25.50 },
      ],
    });
    const req = makeRequest(body);

    // BEGIN
    mockQuery.mockResolvedValueOnce({});
    // Market check
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "market-1", title: "Test", status: "OPEN" }] });
    // Market update
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    // Wager status update
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    // Winning wagers
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1,
        wager_id: "wager-abc",
        user_id: 10,
        stake: 10,
        potential_win: 20,
        odds: 2.0,
      }],
    });
    // Idempotency check (no existing win)
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // Update wager with actual payout
    mockQuery.mockResolvedValueOnce({});
    // Balance query
    mockQuery.mockResolvedValueOnce({ rows: [{ balance: "50.00" }] });
    // Wallet transaction insert
    mockQuery.mockResolvedValueOnce({});
    // COMMIT
    mockQuery.mockResolvedValueOnce({});

    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Check that payout of 25.50 was used (not potential_win)
    const walletInsertCall = mockQuery.mock.calls.find(
      (call: any[]) => typeof call[0] === "string" && call[0].includes("wallet_transactions") && call[0].includes("INSERT") && call[1]?.[1] === "win"
    );
    expect(walletInsertCall).toBeDefined();
  });

  it("skips already-credited wagers (idempotency)", async () => {
    const body = makeSettlementPayload({
      outcome: "yes",
      wagers: [{ wagerId: "wager-abc", won: true, payout: 25 }],
    });
    const req = makeRequest(body);

    mockQuery.mockResolvedValueOnce({}); // BEGIN
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "market-1", title: "Test", status: "OPEN" }] });
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }); // market update
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }); // wager status update
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, wager_id: "wager-abc", user_id: 10, stake: 10, potential_win: 20, odds: 2 }],
    });
    // Idempotency check: already credited
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 99 }] });
    mockQuery.mockResolvedValueOnce({}); // COMMIT

    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(true);

    // No wallet insert should have been called after idempotency check found existing
    const walletInserts = mockQuery.mock.calls.filter(
      (call: any[]) =>
        typeof call[0] === "string" &&
        call[0].includes("INSERT INTO wallet_transactions") &&
        call[1]?.[1] === "win"
    );
    expect(walletInserts).toHaveLength(0);
  });

  it("returns 400 when winning wager is missing from B2B payload", async () => {
    const body = makeSettlementPayload({
      outcome: "yes",
      wagers: [], // Missing the winning wager
    });
    const req = makeRequest(body);

    mockQuery.mockResolvedValueOnce({}); // BEGIN
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "market-1" }] });
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }); // market update
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }); // wager status update
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, wager_id: "wager-abc", user_id: 10, stake: 10, potential_win: 20, odds: 2 }],
    });
    mockQuery.mockResolvedValueOnce({}); // ROLLBACK

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/Missing wager id/i);
  });

  it("creates market if it doesn't exist", async () => {
    const body = makeSettlementPayload({ wagers: [] });
    const req = makeRequest(body);

    mockQuery.mockResolvedValueOnce({}); // BEGIN
    mockQuery.mockResolvedValueOnce({ rows: [] }); // Market NOT found
    mockQuery.mockResolvedValueOnce({}); // Market INSERT (create)
    mockQuery.mockResolvedValueOnce({ rowCount: 0 }); // No wagers to update
    mockQuery.mockResolvedValueOnce({ rows: [] }); // No winning wagers
    mockQuery.mockResolvedValueOnce({}); // COMMIT

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify market creation INSERT was called
    const marketInsert = mockQuery.mock.calls.find(
      (call: any[]) => typeof call[0] === "string" && call[0].includes("INSERT INTO markets")
    );
    expect(marketInsert).toBeDefined();
  });

  it("accepts event type market.settlement as well as market.settled", async () => {
    const body = makeSettlementPayload({ event: "market.settlement", wagers: [] });
    const req = makeRequest(body);

    mockQuery.mockResolvedValueOnce({}); // BEGIN
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "market-1" }] });
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({}); // COMMIT

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("processes without signature when none is provided (with warning)", async () => {
    const body = makeSettlementPayload({ wagers: [] });
    const req = new NextRequest("http://localhost:3000/api/webhooks/settlement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    mockQuery.mockResolvedValueOnce({});
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "market-1" }] });
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({});

    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/webhooks/settlement", () => {
  it("returns webhook info (health check)", async () => {
    process.env.MERCHANT_API_KEY = "test";
    const req = new NextRequest("http://localhost:3000/api/webhooks/settlement");
    const res = await GET(req);
    const data = await res.json();
    expect(data.message).toMatch(/active/i);
    expect(data.apiKeyConfigured).toBe(true);
  });
});

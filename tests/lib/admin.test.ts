import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  createAdminSessionToken,
  verifyAdminSessionCookie,
  getAdminSessionCookieName,
} from "@/lib/admin";

// Mock the database pool (isAdmin uses it, but we test simpler functions here)
vi.mock("@/lib/db", () => ({
  getPool: vi.fn(() => ({
    query: vi.fn().mockResolvedValue({ rows: [] }),
  })),
}));

const TEST_SECRET = "test-admin-secret-123";

describe("admin session management", () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.ADMIN_SECRET;
    delete process.env.ADMIN_PASSWORD;
  });

  describe("getAdminSessionCookieName", () => {
    it("returns the cookie name", () => {
      expect(getAdminSessionCookieName()).toBe("admin_session");
    });
  });

  describe("createAdminSessionToken", () => {
    it("returns a string with payload.signature format", () => {
      const token = createAdminSessionToken();
      expect(token).toContain(".");
      const parts = token.split(".");
      expect(parts).toHaveLength(2);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
    });

    it("payload contains admin=true and future exp", () => {
      const token = createAdminSessionToken();
      const [b64] = token.split(".");
      const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
      expect(payload.admin).toBe(true);
      expect(payload.exp).toBeGreaterThan(Date.now());
    });

    it("exp is approximately 24h from now", () => {
      const before = Date.now();
      const token = createAdminSessionToken();
      const after = Date.now();
      const [b64] = token.split(".");
      const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
      const ttl = 24 * 60 * 60 * 1000;
      expect(payload.exp).toBeGreaterThanOrEqual(before + ttl - 100);
      expect(payload.exp).toBeLessThanOrEqual(after + ttl + 100);
    });

    it("throws if no ADMIN_SECRET or ADMIN_PASSWORD is set", () => {
      delete process.env.ADMIN_SECRET;
      delete process.env.ADMIN_PASSWORD;
      expect(() => createAdminSessionToken()).toThrow("ADMIN_SECRET or ADMIN_PASSWORD required");
    });

    it("falls back to ADMIN_PASSWORD when ADMIN_SECRET is not set", () => {
      delete process.env.ADMIN_SECRET;
      process.env.ADMIN_PASSWORD = "fallback-password";
      const token = createAdminSessionToken();
      expect(token).toContain(".");
    });
  });

  describe("verifyAdminSessionCookie", () => {
    function makeRequest(cookieValue?: string): NextRequest {
      const req = new NextRequest("http://localhost:3000/api/test");
      if (cookieValue) {
        (req as any).setCookie("admin_session", cookieValue);
      }
      return req;
    }

    it("returns true for a valid token", () => {
      const token = createAdminSessionToken();
      const req = makeRequest(token);
      expect(verifyAdminSessionCookie(req)).toBe(true);
    });

    it("returns false when no cookie is present", () => {
      const req = makeRequest();
      expect(verifyAdminSessionCookie(req)).toBe(false);
    });

    it("returns false for empty cookie value", () => {
      const req = makeRequest("");
      expect(verifyAdminSessionCookie(req)).toBe(false);
    });

    it("returns false for tampered payload", () => {
      const token = createAdminSessionToken();
      const [, sig] = token.split(".");
      // Create a different payload
      const tamperedPayload = Buffer.from(
        JSON.stringify({ admin: true, exp: Date.now() + 999999999 }),
        "utf8"
      ).toString("base64url");
      const req = makeRequest(`${tamperedPayload}.${sig}`);
      expect(verifyAdminSessionCookie(req)).toBe(false);
    });

    it("returns false for tampered signature", () => {
      const token = createAdminSessionToken();
      const [b64] = token.split(".");
      const req = makeRequest(`${b64}.tampered-signature`);
      expect(verifyAdminSessionCookie(req)).toBe(false);
    });

    it("returns false for expired token", () => {
      // Create an expired payload manually
      const payload = JSON.stringify({ admin: true, exp: Date.now() - 1000 });
      const b64 = Buffer.from(payload, "utf8").toString("base64url");
      const { createHmac } = require("crypto");
      const sig = createHmac("sha256", TEST_SECRET).update(b64).digest("hex");
      const req = makeRequest(`${b64}.${sig}`);
      expect(verifyAdminSessionCookie(req)).toBe(false);
    });

    it("returns false for token with admin=false", () => {
      const payload = JSON.stringify({ admin: false, exp: Date.now() + 100000 });
      const b64 = Buffer.from(payload, "utf8").toString("base64url");
      const { createHmac } = require("crypto");
      const sig = createHmac("sha256", TEST_SECRET).update(b64).digest("hex");
      const req = makeRequest(`${b64}.${sig}`);
      expect(verifyAdminSessionCookie(req)).toBe(false);
    });

    it("returns false for malformed token (no dot)", () => {
      const req = makeRequest("no-dot-here");
      expect(verifyAdminSessionCookie(req)).toBe(false);
    });

    it("returns false for token with invalid JSON payload", () => {
      const b64 = Buffer.from("not-json", "utf8").toString("base64url");
      const { createHmac } = require("crypto");
      const sig = createHmac("sha256", TEST_SECRET).update(b64).digest("hex");
      const req = makeRequest(`${b64}.${sig}`);
      expect(verifyAdminSessionCookie(req)).toBe(false);
    });
  });
});

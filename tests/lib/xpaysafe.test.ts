import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import {
  getSignedPayloadString,
  signPayload,
  verifyWebhookSignature,
} from "@/lib/xpaysafe";

// ── deepSort / getSignedPayloadString ──

describe("getSignedPayloadString", () => {
  it("sorts top-level keys alphabetically", () => {
    const result = getSignedPayloadString({ z: 1, a: 2, m: 3 });
    expect(result).toBe('{"a":2,"m":3,"z":1}');
  });

  it("sorts nested object keys recursively", () => {
    const result = getSignedPayloadString({
      b: { z: 1, a: 2 },
      a: "hello",
    });
    expect(result).toBe('{"a":"hello","b":{"a":2,"z":1}}');
  });

  it("handles arrays without reordering elements", () => {
    const result = getSignedPayloadString({ items: [3, 1, 2] });
    expect(result).toBe('{"items":[3,1,2]}');
  });

  it("sorts objects inside arrays", () => {
    const result = getSignedPayloadString({
      items: [{ z: 1, a: 2 }],
    });
    expect(result).toBe('{"items":[{"a":2,"z":1}]}');
  });

  it("handles null values", () => {
    const result = getSignedPayloadString({ a: null, b: 1 });
    expect(result).toBe('{"a":null,"b":1}');
  });

  it("handles empty object", () => {
    const result = getSignedPayloadString({});
    expect(result).toBe("{}");
  });

  it("handles deeply nested objects", () => {
    const result = getSignedPayloadString({
      c: { b: { z: 1, a: 2 }, a: "x" },
      a: 1,
    });
    expect(result).toBe('{"a":1,"c":{"a":"x","b":{"a":2,"z":1}}}');
  });
});

// ── signPayload ──

describe("signPayload", () => {
  const apiSecret = "test-secret";
  const salt = "test-salt";

  it("produces a consistent HMAC-SHA256 base64 signature", () => {
    const payload = { orderId: "ORDER-1", amount: 100 };
    const sig1 = signPayload(payload, apiSecret, salt);
    const sig2 = signPayload(payload, apiSecret, salt);
    expect(sig1).toBe(sig2);
  });

  it("signature changes when payload changes", () => {
    const sig1 = signPayload({ amount: 100 }, apiSecret, salt);
    const sig2 = signPayload({ amount: 200 }, apiSecret, salt);
    expect(sig1).not.toBe(sig2);
  });

  it("signature changes when secret changes", () => {
    const payload = { orderId: "ORDER-1" };
    const sig1 = signPayload(payload, "secret-a", salt);
    const sig2 = signPayload(payload, "secret-b", salt);
    expect(sig1).not.toBe(sig2);
  });

  it("signature changes when salt changes", () => {
    const payload = { orderId: "ORDER-1" };
    const sig1 = signPayload(payload, apiSecret, "salt-a");
    const sig2 = signPayload(payload, apiSecret, "salt-b");
    expect(sig1).not.toBe(sig2);
  });

  it("matches manual HMAC computation (default base64, apiSecret+salt key)", () => {
    const payload = { b: 2, a: 1 };
    const sorted = '{"a":1,"b":2}';
    const key = apiSecret + salt;
    const expected = crypto.createHmac("sha256", key).update(sorted).digest("base64");
    expect(signPayload(payload, apiSecret, salt)).toBe(expected);
  });

  it("key order ignores unsorted payload — produces same signature regardless of key order in input", () => {
    const sig1 = signPayload({ z: 1, a: 2 }, apiSecret, salt);
    const sig2 = signPayload({ a: 2, z: 1 }, apiSecret, salt);
    expect(sig1).toBe(sig2);
  });
});

// ── verifyWebhookSignature ──

describe("verifyWebhookSignature", () => {
  const apiSecret = "webhook-secret";
  const salt = "webhook-salt";

  function makeSignature(body: string): string {
    const key = apiSecret + salt;
    return crypto.createHmac("sha256", key).update(body).digest("base64");
  }

  it("returns true for valid signature", () => {
    const body = '{"event":"payment.success"}';
    const sig = makeSignature(body);
    expect(verifyWebhookSignature(body, sig, apiSecret, salt)).toBe(true);
  });

  it("returns false for tampered body", () => {
    const body = '{"event":"payment.success"}';
    const sig = makeSignature(body);
    expect(verifyWebhookSignature('{"event":"payment.hacked"}', sig, apiSecret, salt)).toBe(false);
  });

  it("returns false for null signature", () => {
    expect(verifyWebhookSignature("body", null, apiSecret, salt)).toBe(false);
  });

  it("returns false for empty string signature", () => {
    expect(verifyWebhookSignature("body", "", apiSecret, salt)).toBe(false);
  });

  it("returns false for wrong secret", () => {
    const body = '{"test":true}';
    const sig = makeSignature(body);
    expect(verifyWebhookSignature(body, sig, "wrong-secret", salt)).toBe(false);
  });

  it("returns false for wrong salt", () => {
    const body = '{"test":true}';
    const sig = makeSignature(body);
    expect(verifyWebhookSignature(body, sig, apiSecret, "wrong-salt")).toBe(false);
  });

  it("returns false for malformed base64 signature", () => {
    expect(verifyWebhookSignature("body", "not-valid-base64!!!", apiSecret, salt)).toBe(false);
  });

  it("uses timing-safe comparison (key = apiSecret+salt, base64)", () => {
    const body = "test-body";
    const key = apiSecret + salt;
    const expected = crypto.createHmac("sha256", key).update(body).digest("base64");
    expect(verifyWebhookSignature(body, expected, apiSecret, salt)).toBe(true);
  });
});

// ── Environment-driven config ──

describe("signPayload with XPAYSAFE_SIGNATURE_ENCODING=hex", () => {
  beforeEach(() => {
    process.env.XPAYSAFE_SIGNATURE_ENCODING = "hex";
  });
  afterEach(() => {
    delete process.env.XPAYSAFE_SIGNATURE_ENCODING;
  });

  it("produces hex-encoded signature when env is set to hex", () => {
    const payload = { a: 1 };
    const sig = signPayload(payload, "secret", "salt");
    // hex chars only
    expect(sig).toMatch(/^[0-9a-f]+$/);
  });
});

describe("signPayload with XPAYSAFE_KEY_ORDER=salt_first", () => {
  beforeEach(() => {
    process.env.XPAYSAFE_KEY_ORDER = "salt_first";
    delete process.env.XPAYSAFE_SIGNATURE_ENCODING;
  });
  afterEach(() => {
    delete process.env.XPAYSAFE_KEY_ORDER;
  });

  it("uses salt+apiSecret key order when env is set", () => {
    const payload = { a: 1 };
    const sorted = '{"a":1}';
    const key = "salt" + "secret"; // salt first
    const expected = crypto.createHmac("sha256", key).update(sorted).digest("base64");
    expect(signPayload(payload, "secret", "salt")).toBe(expected);
  });
});

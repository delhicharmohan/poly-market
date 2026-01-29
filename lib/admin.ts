import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";

const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function getUserId(request: NextRequest): string | null {
  return request.headers.get("X-User-ID");
}

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("ADMIN_SECRET or ADMIN_PASSWORD required for admin session");
  return secret;
}

/** Create a signed admin session token (static admin login). */
export function createAdminSessionToken(): string {
  const payload = JSON.stringify({
    admin: true,
    exp: Date.now() + SESSION_TTL_MS,
  });
  const b64 = Buffer.from(payload, "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(b64).digest("hex");
  return `${b64}.${sig}`;
}

/** Verify admin session cookie. Returns true if valid. */
export function verifyAdminSessionCookie(request: NextRequest): boolean {
  try {
    const cookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!cookie) return false;
    const [b64, sig] = cookie.split(".");
    if (!b64 || !sig) return false;
    const expectedSig = createHmac("sha256", getSecret()).update(b64).digest("hex");
    if (sig.length !== expectedSig.length || !timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expectedSig, "utf8"))) return false;
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
    if (!payload.admin || !payload.exp || payload.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function getAdminSessionCookieName(): string {
  return ADMIN_SESSION_COOKIE;
}

/**
 * Check if the current request is from an admin.
 * 1) Valid admin_session cookie (static admin creds).
 * 2) ADMIN_FIREBASE_UID or ADMIN_EMAILS (Firebase user).
 */
export async function isAdmin(request: NextRequest): Promise<boolean> {
  if (verifyAdminSessionCookie(request)) return true;

  const uid = getUserId(request);
  if (!uid) return false;

  const adminUid = process.env.ADMIN_FIREBASE_UID?.trim();
  if (adminUid && uid === adminUid) return true;

  const adminEmailsRaw = process.env.ADMIN_EMAILS;
  if (!adminEmailsRaw) return false;

  const pool = getPool();
  const userResult = await pool.query(
    "SELECT email FROM users WHERE firebase_uid = $1",
    [uid]
  );
  if (userResult.rows.length === 0) return false;

  const email = (userResult.rows[0].email as string)?.toLowerCase() || "";
  const allowed = adminEmailsRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email);
}

export function requireAdminUserId(request: NextRequest): string | null {
  return getUserId(request);
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionToken, getAdminSessionCookieName } from "@/lib/admin";

const COOKIE_OPTIONS = "Path=/; HttpOnly; SameSite=Lax; Max-Age=86400"; // 24h

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const adminUsername = process.env.ADMIN_USERNAME?.trim();
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();

    if (!adminUsername || !adminPassword) {
      return NextResponse.json(
        { message: "Admin login not configured" },
        { status: 503 }
      );
    }

    if (!username || !password) {
      return NextResponse.json(
        { message: "Username and password required" },
        { status: 400 }
      );
    }

    const userOk = username.trim() === adminUsername;
    const passOk = password.length > 0 && password === adminPassword;
    if (!userOk || !passOk) {
      return NextResponse.json(
        { message: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken();
    const cookieName = getAdminSessionCookieName();
    const res = NextResponse.json({ success: true });
    res.headers.set(
      "Set-Cookie",
      `${cookieName}=${token}; ${COOKIE_OPTIONS}`
    );
    return res;
  } catch (error: any) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { message: error.message || "Login failed" },
      { status: 500 }
    );
  }
}

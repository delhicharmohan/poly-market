import { NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/admin";

export async function POST() {
  const cookieName = getAdminSessionCookieName();
  const res = NextResponse.json({ success: true });
  res.headers.set(
    "Set-Cookie",
    `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return res;
}

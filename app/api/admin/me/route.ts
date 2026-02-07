import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await isAdmin(request);
    return NextResponse.json({ isAdmin: admin });
  } catch (error: any) {
    console.error("Error checking admin:", error);
    return NextResponse.json({ isAdmin: false });
  }
}

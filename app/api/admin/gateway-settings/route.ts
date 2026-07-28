import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await isAdmin(request);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const pool = getPool();
    const result = await pool.query("SELECT key, value FROM gateway_settings");
    
    const settings: Record<string, string> = {
      payin_gateway: "p2p",
      payout_gateway: "p2p",
    };

    result.rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("Error reading gateway settings:", error);
    return NextResponse.json(
      { message: error.message || "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await isAdmin(request);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { payin_gateway, payout_gateway } = body;

    if (
      (payin_gateway && payin_gateway !== "p2p" && payin_gateway !== "xpaysafe") ||
      (payout_gateway && payout_gateway !== "p2p" && payout_gateway !== "xpaysafe")
    ) {
      return NextResponse.json({ message: "Invalid gateway value" }, { status: 400 });
    }

    const pool = getPool();
    
    if (payin_gateway) {
      await pool.query(
        "INSERT INTO gateway_settings (key, value, updated_at) VALUES ('payin_gateway', $1, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP",
        [payin_gateway]
      );
    }

    if (payout_gateway) {
      await pool.query(
        "INSERT INTO gateway_settings (key, value, updated_at) VALUES ('payout_gateway', $1, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP",
        [payout_gateway]
      );
    }

    return NextResponse.json({ success: true, message: "Gateway settings updated successfully" });
  } catch (error: any) {
    console.error("Error updating gateway settings:", error);
    return NextResponse.json(
      { message: error.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}

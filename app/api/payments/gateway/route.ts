import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public, read-only: the admin-configured default payin gateway.
 * Used by the Merchandise page to preselect the deposit method.
 * Returns only the gateway name ("p2p" | "xpaysafe"); no credentials.
 */
export async function GET() {
  let payinGateway = "p2p";
  try {
    const result = await getPool().query(
      "SELECT value FROM gateway_settings WHERE key = 'payin_gateway'"
    );
    if (result?.rows?.length > 0) payinGateway = result.rows[0].value;
  } catch (err) {
    console.error("Failed to read payin_gateway setting:", err);
  }
  return NextResponse.json({ payin_gateway: payinGateway });
}

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseUid, email, displayName } = body;

    if (!firebaseUid || !email) {
      return NextResponse.json(
        { message: "firebaseUid and email are required" },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Upsert user
    const result = await pool.query(
      `INSERT INTO users (firebase_uid, email, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (firebase_uid) 
       DO UPDATE SET 
         email = EXCLUDED.email,
         display_name = EXCLUDED.display_name,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, firebase_uid, email, display_name, created_at, is_blocked`,
      [firebaseUid, email, displayName || null]
    );

    // Prevent blocked users from accessing the platform
    if (result.rows[0]?.is_blocked) {
      return NextResponse.json(
        { success: false, message: "Account blocked. Contact support." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error("Error syncing user:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
    });
    return NextResponse.json(
      {
        message: error.message || "Failed to sync user",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}


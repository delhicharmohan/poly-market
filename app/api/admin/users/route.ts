import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getPool } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT u.id, u.firebase_uid as "firebaseUid", u.email, u.display_name as "displayName",
              u.created_at as "createdAt",
              COALESCE(SUM(wt.amount), 0)::float as balance
       FROM users u
       LEFT JOIN wallet_transactions wt ON wt.user_id = u.id
       GROUP BY u.id, u.firebase_uid, u.email, u.display_name, u.created_at
       ORDER BY u.created_at DESC
       LIMIT 500`
    );

    const users = result.rows.map((row) => ({
      id: row.id,
      firebaseUid: row.firebaseUid,
      email: row.email,
      displayName: row.displayName,
      balance: parseFloat(row.balance) || 0,
      createdAt: new Date(row.createdAt).toISOString(),
    }));

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Error fetching admin users:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

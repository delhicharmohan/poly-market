import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getPool } from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT u.id, u.firebase_uid as "firebaseUid", u.email, u.display_name as "displayName",
              u.is_blocked as "isBlocked",
              u.created_at as "createdAt",
              COALESCE(SUM(wt.amount), 0)::float as balance
       FROM users u
       LEFT JOIN wallet_transactions wt ON wt.user_id = u.id
       GROUP BY u.id, u.firebase_uid, u.email, u.display_name, u.is_blocked, u.created_at
       ORDER BY u.created_at DESC
       LIMIT 500`
    );

    const users = result.rows.map((row) => ({
      id: row.id,
      firebaseUid: row.firebaseUid,
      email: row.email,
      displayName: row.displayName,
      isBlocked: row.isBlocked || false,
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

/** Admin: manually add a user (email + optional display name). */
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { email, displayName } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { message: "A valid email is required" },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Generate a placeholder firebase_uid so the column's NOT-NULL constraint is satisfied.
    const placeholderUid = `admin_added_${randomUUID()}`;

    const result = await pool.query(
      `INSERT INTO users (firebase_uid, email, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, firebase_uid as "firebaseUid", email, display_name as "displayName",
                 is_blocked as "isBlocked", created_at as "createdAt"`,
      [placeholderUid, email.trim().toLowerCase(), displayName || null]
    );

    const user = result.rows[0];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        isBlocked: user.isBlocked || false,
        balance: 0,
        createdAt: new Date(user.createdAt).toISOString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error adding user:", error);

    // Handle duplicate email
    if (error.code === "23505") {
      return NextResponse.json(
        { message: "A user with this email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: error.message || "Failed to add user" },
      { status: 500 }
    );
  }
}


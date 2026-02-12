import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Admin: block or unblock a user. Body: { blocked: boolean } */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        if (!(await isAdmin(request))) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const { id } = params;
        if (!id) {
            return NextResponse.json({ message: "User ID is required" }, { status: 400 });
        }

        const body = await request.json();
        const blocked = Boolean(body.blocked);

        const pool = getPool();
        const result = await pool.query(
            `UPDATE users SET is_blocked = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, is_blocked as "isBlocked"`,
            [blocked, id]
        );

        if (result.rowCount === 0) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            user: result.rows[0],
            message: blocked ? "User blocked" : "User unblocked",
        });
    } catch (error: any) {
        console.error("Error updating user block status:", error);
        return NextResponse.json(
            { message: error.message || "Failed to update block status" },
            { status: 500 }
        );
    }
}

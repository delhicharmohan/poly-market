import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Admin: delete a user by UUID. */
export async function DELETE(
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

        const pool = getPool();
        const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);

        if (result.rowCount === 0) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "User deleted" });
    } catch (error: any) {
        console.error("Error deleting user:", error);
        return NextResponse.json(
            { message: error.message || "Failed to delete user" },
            { status: 500 }
        );
    }
}

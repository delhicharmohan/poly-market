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
      `SELECT s.id, s.invoice_number as "invoiceNumber", s.painting_id as "paintingId",
              s.painting_name as "paintingName", s.painting_image_url as "paintingImageUrl",
              s.amount_inr as "amountInr", s.email_sent_at as "emailSentAt",
              s.created_at as "createdAt",
              u.email as "userEmail",
              u.display_name as "userDisplayName"
       FROM sales s
       JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC
       LIMIT 500`
    );

    const sales = result.rows.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      paintingId: row.paintingId,
      paintingName: row.paintingName,
      paintingImageUrl: row.paintingImageUrl,
      amountInr: parseFloat(row.amountInr),
      emailSentAt: row.emailSentAt ? new Date(row.emailSentAt).toISOString() : null,
      createdAt: new Date(row.createdAt).toISOString(),
      userEmail: row.userEmail,
      userDisplayName: row.userDisplayName,
    }));

    return NextResponse.json({ sales });
  } catch (error: any) {
    console.error("Error fetching admin sales:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch sales" },
      { status: 500 }
    );
  }
}

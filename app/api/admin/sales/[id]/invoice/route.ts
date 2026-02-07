import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getPool } from "@/lib/db";
import { formatInvoiceDateTime, generateInvoicePdf } from "@/lib/invoice-pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id: saleId } = await params;
    if (!saleId) {
      return NextResponse.json({ message: "Sale ID required" }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT s.invoice_number as "invoiceNumber", s.painting_name as "paintingName",
              s.amount_inr as "amountInr", s.created_at as "createdAt",
              u.email as "userEmail"
       FROM sales s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1`,
      [saleId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ message: "Sale not found" }, { status: 404 });
    }

    const row = result.rows[0];
    const createdAt = new Date(row.createdAt);
    const dateStr = createdAt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const dateTimeStr = formatInvoiceDateTime(createdAt);

    const pdfBuffer = await generateInvoicePdf({
      invoiceNumber: row.invoiceNumber,
      date: dateStr,
      dateTime: dateTimeStr,
      customerEmail: row.userEmail,
      paintingName: row.paintingName,
      amountInr: parseFloat(row.amountInr),
    });

    const filename = `invoice-${row.invoiceNumber}.pdf`;
    // Copy into a new ArrayBuffer so NextResponse accepts it (BodyInit requires ArrayBuffer, not ArrayBufferLike)
    const body = new ArrayBuffer(pdfBuffer.byteLength);
    new Uint8Array(body).set(pdfBuffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.byteLength),
      },
    });
  } catch (error: any) {
    console.error("Error generating invoice PDF:", error);
    return NextResponse.json(
      { message: error.message || "Failed to generate invoice" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { sendSaleEmailWithAttachments } from "@/lib/send-sale-email";

function getUserId(request: NextRequest): string | null {
  return request.headers.get("X-User-ID");
}

function generateInvoiceNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${ts}-${r}`;
}

/** List sales – admin only. Regular users get 403. */
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ message: "Forbidden. Sales are visible only to admins." }, { status: 403 });
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
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch sales" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { paintingId, paintingName, paintingImageUrl, amountInr } = body;

    if (!paintingId || !paintingName || amountInr == null || amountInr <= 0) {
      return NextResponse.json(
        { message: "Missing or invalid: paintingId, paintingName, amountInr" },
        { status: 400 }
      );
    }

    const pool = getPool();

    const userResult = await pool.query(
      "SELECT id, email FROM users WHERE firebase_uid = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    const userIdDb = userResult.rows[0].id;
    const userEmail = userResult.rows[0].email || undefined;

    const amount = parseFloat(String(amountInr));
    const invoiceNumber = generateInvoiceNumber();

    // Get current balance; we will ADD free points (equivalent to painting amount) for wagering when buy completes.
    const balanceResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as balance
       FROM wallet_transactions WHERE user_id = $1`,
      [userIdDb]
    );
    const balance = parseFloat(balanceResult.rows[0].balance) || 0;
    const newBalance = balance + amount;

    const depositDescription = `Free points (wagering) - Purchase: ${paintingName} (Rs. ${amount.toLocaleString("en-IN")})`;

    const wtResult = await pool.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
       VALUES ($1, 'deposit', $2, $3, $4)
       RETURNING id, created_at`,
      [userIdDb, amount, newBalance, depositDescription]
    );
    const walletTransactionId = wtResult.rows[0].id;

    const saleResult = await pool.query(
      `INSERT INTO sales (user_id, invoice_number, painting_id, painting_name, painting_image_url, amount_inr, wallet_transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, invoice_number, created_at`,
      [
        userIdDb,
        invoiceNumber,
        paintingId,
        paintingName,
        paintingImageUrl || null,
        amount,
        walletTransactionId,
      ]
    );
    const sale = saleResult.rows[0];

    if (userEmail) {
      const emailResult = await sendSaleEmailWithAttachments({
        to: userEmail,
        paintingName,
        paintingImageUrl: paintingImageUrl || "",
        amountInr: amount,
        invoiceNumber,
      });
      if (emailResult.ok) {
        await pool.query(
          "UPDATE sales SET email_sent_at = CURRENT_TIMESTAMP WHERE id = $1",
          [sale.id]
        );
      }
    }

    return NextResponse.json({
      success: true,
      sale: {
        id: sale.id,
        invoiceNumber: sale.invoice_number,
        paintingId,
        paintingName,
        amountInr: amount,
        createdAt: new Date(sale.created_at).toISOString(),
      },
      balance: newBalance,
    });
  } catch (error: any) {
    console.error("Error creating sale:", error);
    return NextResponse.json(
      { message: error.message || "Failed to complete purchase" },
      { status: 500 }
    );
  }
}

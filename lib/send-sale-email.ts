import { generateInvoicePdf, formatInvoiceDateTime, InvoiceData } from "./invoice-pdf";

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Merchandise <onboarding@resend.dev>";

export interface SaleEmailParams {
  to: string;
  paintingName: string;
  paintingImageUrl: string;
  amountInr: number;
  invoiceNumber: string;
}

/** Send sale confirmation email with PDF invoice and painting image attached. */
export async function sendSaleEmailWithAttachments(params: SaleEmailParams): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set; skipping email.");
    return { ok: false, error: "Email not configured" };
  }

  try {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const dateTimeStr = formatInvoiceDateTime(now);

    const invoiceData: InvoiceData = {
      invoiceNumber: params.invoiceNumber,
      date: dateStr,
      dateTime: dateTimeStr,
      customerEmail: params.to,
      paintingName: params.paintingName,
      amountInr: params.amountInr,
    };
    const pdfBuffer = await generateInvoicePdf(invoiceData);
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    const attachments: { filename: string; content: string }[] = [
      { filename: `invoice-${params.invoiceNumber}.pdf`, content: pdfBase64 },
    ];

    // Fetch painting image and attach
    if (params.paintingImageUrl) {
      try {
        const imgRes = await fetch(params.paintingImageUrl);
        if (imgRes.ok) {
          const arrBuf = await imgRes.arrayBuffer();
          const imageBase64 = Buffer.from(arrBuf).toString("base64");
          attachments.push({ filename: "painting.jpg", content: imageBase64 });
        }
      } catch (e) {
        console.warn("Could not fetch painting image for email:", e);
      }
    }

    const body = {
      from: FROM_EMAIL,
      to: [params.to],
      subject: `Your painting purchase – ${params.paintingName} (Invoice ${params.invoiceNumber})`,
      html: `
        <h2>Thank you for your purchase</h2>
        <p>You have purchased: <strong>${params.paintingName}</strong></p>
        <p>Amount: <strong>₹${params.amountInr.toLocaleString("en-IN")} INR</strong></p>
        <p>Invoice number: <strong>${params.invoiceNumber}</strong></p>
        <p>Please find your invoice (PDF) and the painting image attached.</p>
        <p>— Merchandise Store</p>
      `,
      attachments,
    };

    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data as { message?: string }).message || res.statusText || "Failed to send email";
      console.error("Resend API error:", res.status, data);
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (err: any) {
    console.error("Send sale email error:", err);
    return { ok: false, error: err?.message || "Failed to send email" };
  }
}

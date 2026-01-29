import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  /** Full date and time of sale, e.g. "28 Jan 2026, 10:30 PM" */
  dateTime?: string;
  customerEmail: string;
  paintingName: string;
  amountInr: number;
}

/** Format a Date for invoice: "28 Jan 2026, 10:30 PM" (WinAnsi-safe). */
export function formatInvoiceDateTime(d: Date): string {
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 595;
  const pageHeight = 842;
  const page = doc.addPage([pageWidth, pageHeight]);
  const margin = 50;
  const rightEdge = pageWidth - margin;
  const contentWidth = rightEdge - margin;
  let y = pageHeight - margin;

  const drawLine = (yPos: number, fromX = margin, toX = rightEdge, thick = 0.5) => {
    page.drawLine({
      start: { x: fromX, y: yPos },
      end: { x: toX, y: yPos },
      thickness: thick,
      color: rgb(0.75, 0.75, 0.78),
    });
  };

  const drawRect = (x: number, y: number, w: number, h: number, color: [number, number, number]) => {
    page.drawRectangle({ x, y, width: w, height: h, color: rgb(...color) });
  };

  // ----- Header block -----
  const headerHeight = 72;
  drawRect(0, pageHeight - headerHeight, pageWidth, headerHeight, [0.22, 0.27, 0.38]);
  y = pageHeight - 28;

  page.drawText("MERCHANDISE STORE", {
    x: margin,
    y,
    size: 22,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  y -= 14;
  page.drawText("Art & Collectibles", {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.85, 0.87, 0.9),
  });

  page.drawText("INVOICE", {
    x: rightEdge - fontBold.widthOfTextAtSize("INVOICE", 18),
    y: pageHeight - 32,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  const invNum = `#${data.invoiceNumber}`;
  page.drawText(invNum, {
    x: rightEdge - font.widthOfTextAtSize(invNum, 11),
    y: pageHeight - 48,
    size: 11,
    font,
    color: rgb(0.9, 0.9, 0.92),
  });

  y = pageHeight - headerHeight - 24;
  drawLine(y);
  y -= 28;

  // ----- Invoice details (left) & Bill To (right) -----
  page.drawText("Invoice Date", {
    x: margin,
    y,
    size: 8,
    font,
    color: rgb(0.45, 0.45, 0.5),
  });
  page.drawText(data.date, {
    x: margin,
    y: y - 11,
    size: 11,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.2),
  });

  const dateTimeStr = data.dateTime ?? data.date;
  page.drawText("Time of Sale", {
    x: margin,
    y: y - 28,
    size: 8,
    font,
    color: rgb(0.45, 0.45, 0.5),
  });
  page.drawText(dateTimeStr, {
    x: margin,
    y: y - 39,
    size: 11,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.2),
  });

  const billToX = margin + contentWidth * 0.5;
  page.drawText("Bill To", {
    x: billToX,
    y,
    size: 8,
    font,
    color: rgb(0.45, 0.45, 0.5),
  });
  page.drawText(data.customerEmail, {
    x: billToX,
    y: y - 12,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.25),
  });

  y -= 52;
  drawLine(y);
  y -= 20;

  // ----- Table -----
  const tableTop = y;
  const rowHeight = 22;
  const col1Width = contentWidth * 0.65;
  const col2Width = contentWidth * 0.35;

  drawRect(margin, y - rowHeight, contentWidth, rowHeight, [0.94, 0.95, 0.96]);
  page.drawText("Description", {
    x: margin + 10,
    y: y - 15,
    size: 10,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.28),
  });
  page.drawText("Amount (INR)", {
    x: margin + col1Width + 10,
    y: y - 15,
    size: 10,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.28),
  });
  y -= rowHeight;
  drawLine(y);

  const itemY = y - 14;
  const desc = data.paintingName.length > 50 ? data.paintingName.slice(0, 47) + "..." : data.paintingName;
  page.drawText(desc, {
    x: margin + 10,
    y: itemY,
    size: 11,
    font,
    color: rgb(0.18, 0.18, 0.22),
  });
  const amountStr = `Rs. ${data.amountInr.toLocaleString("en-IN")}`;
  page.drawText(amountStr, {
    x: margin + col1Width + col2Width - font.widthOfTextAtSize(amountStr, 11) - 10,
    y: itemY,
    size: 11,
    font,
    color: rgb(0.18, 0.18, 0.22),
  });
  y -= rowHeight + 8;
  drawLine(y);

  // ----- Total -----
  y -= 12;
  drawRect(margin, y - rowHeight, contentWidth, rowHeight, [0.92, 0.94, 0.97]);
  page.drawText("Total", {
    x: margin + 10,
    y: y - 15,
    size: 12,
    font: fontBold,
    color: rgb(0.12, 0.12, 0.18),
  });
  const totalStr = `Rs. ${data.amountInr.toLocaleString("en-IN")}`;
  page.drawText(totalStr, {
    x: margin + col1Width + col2Width - fontBold.widthOfTextAtSize(totalStr, 12) - 10,
    y: y - 15,
    size: 12,
    font: fontBold,
    color: rgb(0.12, 0.12, 0.18),
  });
  y -= rowHeight + 28;
  drawLine(y, margin, rightEdge, 0.8);
  y -= 32;

  // ----- Footer -----
  page.drawText("Thank you for your business.", {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.25, 0.25, 0.3),
  });
  y -= 14;
  page.drawText("Payment received. This invoice is for your records.", {
    x: margin,
    y,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.55),
  });
  y -= 24;

  drawLine(y);
  y -= 14;
  page.drawText("Merchandise Store", {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: rgb(0.4, 0.4, 0.45),
  });
  page.drawText(`Invoice ${data.invoiceNumber}`, {
    x: rightEdge - font.widthOfTextAtSize(`Invoice ${data.invoiceNumber}`, 8),
    y,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.55),
  });
  y -= 10;
  page.drawText("Art & Collectibles | This is a computer-generated invoice.", {
    x: margin,
    y,
    size: 7,
    font,
    color: rgb(0.55, 0.55, 0.6),
  });

  return doc.save();
}

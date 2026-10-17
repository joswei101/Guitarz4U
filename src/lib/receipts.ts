import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Order, OrderItem, Payment } from "@prisma/client";
import { formatZAR } from "./money";
import { site } from "./site";

/** pdf-lib's standard fonts only support WinAnsi; replace anything else. */
function clean(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

export interface ReceiptInput {
  title: string;
  number: string;
  date: Date;
  customerName: string;
  customerEmail: string;
  lines: { description: string; quantity: number; amountCents: number }[];
  subtotalCents: number;
  discountCents?: number;
  totalCents: number;
  paymentLines: string[];
  notes: string[];
}

export async function renderReceiptPdf(r: ReceiptInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${r.title} ${r.number}`);
  pdf.setAuthor(site.name);
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const orange = rgb(1, 0.62, 0.11);
  let y = 790;
  const text = (s: string, x: number, size = 10, f = font, color = rgb(0.1, 0.1, 0.1)) => page.drawText(clean(s), { x, y, size, font: f, color });

  page.drawRectangle({ x: 0, y: 760, width: 595, height: 82, color: rgb(0.04, 0.04, 0.04) });
  y = 805;
  text("GUITARZ", 40, 24, bold, rgb(1, 1, 1));
  page.drawText("4U", { x: 40 + bold.widthOfTextAtSize("GUITARZ", 24), y, size: 24, font: bold, color: orange });
  y = 785;
  text(site.tagline, 40, 9, font, rgb(0.7, 0.7, 0.7));
  y = 805;
  text(r.title.toUpperCase(), 400, 14, bold, rgb(1, 1, 1));
  y = 730;
  text(`Number: ${r.number}`, 40, 10, bold);
  text(`Date: ${r.date.toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" })}`, 330);
  y -= 16;
  text(`Customer: ${r.customerName}`, 40);
  text(r.customerEmail, 330);
  y -= 16;
  text(`${site.name} · ${site.area}, ${site.country} · ${site.email} · WhatsApp ${site.whatsappDisplay}`, 40, 8, font, rgb(0.4, 0.4, 0.4));

  y -= 34;
  page.drawRectangle({ x: 40, y: y - 6, width: 515, height: 22, color: rgb(0.95, 0.95, 0.95) });
  text("Description", 48, 10, bold);
  text("Qty", 400, 10, bold);
  text("Amount", 470, 10, bold);
  y -= 26;
  for (const l of r.lines) {
    const desc = clean(l.description);
    const chunks = desc.match(/.{1,60}(\s|$)/g) ?? [desc];
    chunks.forEach((c, i) => {
      text(c.trim(), 48);
      if (i === 0) {
        text(String(l.quantity), 404);
        text(formatZAR(l.amountCents), 470);
      }
      y -= 14;
    });
    y -= 4;
  }
  y -= 6;
  page.drawLine({ start: { x: 330, y: y + 8 }, end: { x: 555, y: y + 8 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  const total = (label: string, cents: number, b = false) => {
    text(label, 340, 10, b ? bold : font);
    text(formatZAR(cents), 470, 10, b ? bold : font);
    y -= 16;
  };
  total("Subtotal", r.subtotalCents);
  if (r.discountCents) total("Discount", -r.discountCents);
  total("Total (ZAR)", r.totalCents, true);

  y -= 14;
  text("Payment", 40, 11, bold);
  y -= 16;
  for (const p of r.paymentLines) {
    text(p, 40, 9);
    y -= 13;
  }
  y -= 10;
  for (const n of r.notes) {
    const chunks = clean(n).match(/.{1,105}(\s|$)/g) ?? [n];
    for (const c of chunks) {
      text(c.trim(), 40, 8, font, rgb(0.35, 0.35, 0.35));
      y -= 11;
    }
    y -= 4;
  }
  return pdf.save();
}

export function orderReceiptInput(order: Order & { items: OrderItem[]; payments: Payment[] }): ReceiptInput {
  const paid = order.payments.filter((p) => p.status === "COMPLETE");
  return {
    title: "Receipt",
    number: order.orderNumber,
    date: order.paidAt ?? order.createdAt,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    lines: order.items.map((i) => ({ description: `${i.title} (SKU ${i.sku})`, quantity: i.quantity, amountCents: i.lineTotalCents })),
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    totalCents: order.totalCents,
    paymentLines: paid.map((p) => `Card payment via PayFast · ref ${p.reference} · gateway id ${p.providerPaymentId ?? "-"} · ${formatZAR(p.amountCents)} · verified ${p.verifiedAt?.toISOString().slice(0, 16).replace("T", " ") ?? ""}`),
    notes: [
      "Second-hand goods: items are sold in the condition described and photographed on the product listing at the time of purchase.",
      "Collection only, Sandringham, Johannesburg. Collection details are provided privately.",
      "See the Returns, Refunds & Cancellations policy at /policies/returns for your options.",
    ],
  };
}

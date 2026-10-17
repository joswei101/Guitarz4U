import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { orderReceiptInput, renderReceiptPdf } from "@/lib/receipts";
import { PAID_STATUSES } from "@/lib/shop/order-status";

/** Downloadable PDF receipt — only for orders with a gateway-verified payment. */
export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorised", { status: 401 });
  const { orderId } = await params;
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, payments: true } });
  if (!order || (order.userId !== user.id && !can(user.role, "orders:manage"))) return new NextResponse("Not found", { status: 404 });
  if (!PAID_STATUSES.includes(order.status) || !order.payments.some((p) => p.status === "COMPLETE")) return new NextResponse("A receipt is available once payment is verified.", { status: 409 });
  const pdf = await renderReceiptPdf(orderReceiptInput(order));
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Guitarz4U-receipt-${order.orderNumber}.pdf"`, "Cache-Control": "private, no-store" },
  });
}

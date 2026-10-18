import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ORDER_STATUS_LABELS } from "@/lib/shop/order-status";

export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { orderId } = await params;
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id }, select: { status: true } });
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ status: order.status, label: ORDER_STATUS_LABELS[order.status] }, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can, type Permission } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { rand, toCsv } from "@/lib/csv";

const PERMS: Record<string, Permission> = {
  orders: "orders:manage",
  payments: "finance:view",
  repairs: "repairs:manage",
  inventory: "finance:view",
  enquiries: "enquiries:manage",
  customers: "customers:manage",
  newsletter: "newsletter:manage",
};

function range(url: URL) {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  return { gte: from ? new Date(`${from}T00:00:00+02:00`) : new Date(0), lte: to ? new Date(`${to}T23:59:59+02:00`) : new Date() };
}

/** CSV exports of business records for staff with the relevant permission. */
export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const user = await getCurrentUser();
  const perm = PERMS[kind];
  if (!user || !perm || !can(user.role, perm)) return new NextResponse("Not found", { status: 404 });
  const url = new URL(req.url);
  const createdAt = range(url);
  let csv: string;

  switch (kind) {
    case "orders": {
      const rows = await prisma.order.findMany({ where: { createdAt }, include: { items: true, payments: { where: { status: "COMPLETE" } }, refunds: { where: { status: "COMPLETED" } } }, orderBy: { createdAt: "asc" } });
      csv = toCsv(
        ["order_number", "created_at", "paid_at", "status", "customer_name", "customer_email", "items", "subtotal_zar", "discount_zar", "total_zar", "verified_paid_zar", "refunded_zar", "gateway_ids"],
        rows.map((o) => [o.orderNumber, o.createdAt, o.paidAt, o.status, o.customerName, o.customerEmail, o.items.map((i) => `${i.sku} ${i.title} x${i.quantity}`).join("; "), rand(o.subtotalCents), rand(o.discountCents), rand(o.totalCents), rand(o.payments.reduce((s, p) => s + p.amountCents, 0)), rand(o.refunds.reduce((s, r) => s + r.amountCents, 0)), o.payments.map((p) => p.providerPaymentId).join("; ")]),
      );
      break;
    }
    case "payments": {
      const [payments, refunds] = await Promise.all([
        prisma.payment.findMany({ where: { status: "COMPLETE", verifiedAt: createdAt }, include: { order: { select: { orderNumber: true } }, repairRequest: { select: { reference: true } } }, orderBy: { verifiedAt: "asc" } }),
        prisma.refund.findMany({ where: { status: "COMPLETED", gatewayConfirmedAt: createdAt }, include: { order: { select: { orderNumber: true } } }, orderBy: { gatewayConfirmedAt: "asc" } }),
      ]);
      csv = toCsv(
        ["type", "date", "reference", "for", "amount_zar", "fee_zar", "net_zar", "gateway_reference"],
        [
          ...payments.map((p) => ["payment", p.verifiedAt, p.reference, p.order?.orderNumber ?? p.repairRequest?.reference, rand(p.amountCents), rand(p.feeCents), rand(p.netCents), p.providerPaymentId]),
          ...refunds.map((r) => ["refund", r.gatewayConfirmedAt, r.id, r.order.orderNumber, rand(-r.amountCents), "", "", r.gatewayReference]),
        ],
      );
      break;
    }
    case "repairs": {
      const rows = await prisma.repairRequest.findMany({ where: { createdAt }, include: { quotes: { where: { status: "ACCEPTED" }, include: { lineItems: true } }, manualPayments: true }, orderBy: { createdAt: "asc" } });
      csv = toCsv(
        ["reference", "created_at", "status", "customer", "email", "instrument", "services", "quote_total_zar", "labour_zar", "parts_zar", "recorded_cost_zar", "paid_zar", "completed_at", "collected_at"],
        rows.map((r) => {
          const q = r.quotes[0];
          return [r.reference, r.createdAt, r.status, r.name, r.email, `${r.instrumentType} ${r.brand ?? ""} ${r.model ?? ""}`.trim(), r.services.join("; "), rand(q?.totalCents), rand(q?.labourCents), rand(q?.partsCents), rand(q?.lineItems.reduce((s, l) => s + (l.costCents ?? 0) * l.quantity, 0)), rand(r.manualPayments.reduce((s, p) => s + p.amountCents, 0)), r.completedAt, r.collectedAt];
        }),
      );
      break;
    }
    case "inventory": {
      const rows = await prisma.product.findMany({ include: { category: true }, orderBy: { createdAt: "asc" } });
      csv = toCsv(
        ["sku", "title", "brand", "model", "category", "status", "condition", "quantity", "price_zar", "sale_price_zar", "acquisition_cost_zar", "refurbishment_cost_zar", "acquired_at", "published_at", "sold_at"],
        rows.map((p) => [p.sku, p.title, p.brand, p.model, p.category.name, p.status, p.condition, p.quantity, rand(p.priceCents), rand(p.salePriceCents), rand(p.acquisitionCostCents), rand(p.refurbishmentCostCents), p.acquiredAt, p.publishedAt, p.soldAt]),
      );
      break;
    }
    case "enquiries": {
      const rows = await prisma.purchaseEnquiry.findMany({ where: { createdAt }, include: { offers: true }, orderBy: { createdAt: "asc" } });
      csv = toCsv(
        ["reference", "created_at", "status", "seller", "email", "phone", "type", "brand", "model", "condition", "offers", "agreed_price_zar", "purchased_at"],
        rows.map((e) => [e.reference, e.createdAt, e.status, e.name, e.email, e.phone, e.instrumentType, e.brand, e.model, e.condition, e.offers.map((o) => `${o.party}:${rand(o.amountCents)}:${o.status}`).join("; "), rand(e.agreedPriceCents), e.purchasedAt]),
      );
      break;
    }
    case "customers": {
      const rows = await prisma.user.findMany({ where: { status: { not: "DELETED" } }, include: { _count: { select: { orders: true, repairRequests: true } } }, orderBy: { createdAt: "asc" } });
      csv = toCsv(["name", "email", "phone", "role", "status", "email_verified", "joined", "orders", "repairs"], rows.map((u) => [u.name, u.email, u.phone, u.role, u.status, u.emailVerifiedAt ? "yes" : "no", u.createdAt, u._count.orders, u._count.repairRequests]));
      break;
    }
    case "newsletter": {
      const rows = await prisma.newsletterSubscription.findMany({ where: { status: "SUBSCRIBED" }, orderBy: { confirmedAt: "asc" } });
      csv = toCsv(["email", "consent_at", "confirmed_at", "consent_text"], rows.map((s) => [s.email, s.consentAt, s.confirmedAt, s.consentText]));
      break;
    }
    default:
      return new NextResponse("Not found", { status: 404 });
  }
  await audit({ actorId: user.id, action: "export.csv", entityType: "Export", entityId: kind });
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="guitarz4u-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" } });
}

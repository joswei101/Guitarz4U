import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { PaymentStatusPoller } from "@/components/shop/payment-status";

export const metadata: Metadata = { title: "Confirming payment", robots: { index: false } };

/** Landing page after PayFast. It never trusts the redirect — it waits for the verified ITN. */
export default async function ReturnPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderId } = await searchParams;
  const user = await requireUserPage("/account/orders");
  const order = orderId ? await prisma.order.findFirst({ where: { id: orderId, userId: user.id } }) : null;
  if (!order) notFound();
  return (
    <>
      <PageHeader eyebrow="Checkout" title="Thank you" />
      <div className="container max-w-2xl py-10">
        <PaymentStatusPoller orderId={order.id} orderNumber={order.orderNumber} />
      </div>
    </>
  );
}

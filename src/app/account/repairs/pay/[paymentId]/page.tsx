import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { buildPaymentForm } from "@/lib/payfast";
import { appUrl } from "@/lib/env";
import { centsToDecimalString, formatZAR } from "@/lib/money";
import { AutoSubmitForm } from "@/components/shop/auto-submit-form";
import { Card } from "@/components/ui/misc";

export const metadata = { title: "Repair payment" };

export default async function RepairPayPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const user = await requireUserPage("/account/repairs");
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, purpose: "REPAIR", repairRequest: { userId: user.id } }, include: { repairRequest: true } });
  if (!payment || !payment.repairRequest) notFound();
  if (payment.status !== "PENDING") redirect("/account/repairs");
  const r = payment.repairRequest;
  const [first, ...rest] = r.name.split(" ");
  const form = buildPaymentForm({
    reference: payment.reference,
    amount: centsToDecimalString(payment.amountCents),
    itemName: `Guitarz4U repair ${r.reference}`,
    firstName: first,
    lastName: rest.join(" ") || undefined,
    email: user.email,
    returnUrl: appUrl("/account/repairs?paid=1"),
    cancelUrl: appUrl("/account/repairs"),
    notifyUrl: appUrl("/api/payments/payfast/notify"),
    customStr1: r.id,
  });
  return (
    <Card className="mx-auto max-w-lg space-y-4 text-center">
      <h1 className="font-display text-2xl uppercase">Repair payment</h1>
      <p className="text-bone-muted">Repair {r.reference} · {formatZAR(payment.amountCents)}</p>
      <AutoSubmitForm action={form.action} fields={form.fields} />
    </Card>
  );
}

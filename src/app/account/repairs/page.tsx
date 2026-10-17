import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatZAR } from "@/lib/money";
import { features } from "@/lib/env";
import { REPAIR_STATUS_LABELS } from "@/lib/repairs/status";
import { repairAmountDue } from "@/lib/repairs/payments";
import { startRepairPaymentAction } from "@/app/actions/account";
import { Alert, Card, EmptyState } from "@/components/ui/misc";
import { Button, ButtonLink } from "@/components/ui/button";
import { RepairStatusBadge, fmtDate } from "@/components/status-badges";
import { QuoteResponse } from "@/components/repair-quote-response";
import { site } from "@/lib/site";

export const metadata = { title: "My repairs" };

export default async function MyRepairs({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const user = await requireUserPage("/account/repairs");
  const { paid } = await searchParams;
  const repairs = await prisma.repairRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      statusHistory: { where: { isCustomerVisible: true }, orderBy: { createdAt: "asc" } },
      quotes: { where: { status: { in: ["SENT", "ACCEPTED", "DECLINED"] } }, include: { lineItems: true }, orderBy: { version: "desc" } },
      manualPayments: true,
      warranty: true,
    },
  });
  const dues = new Map(await Promise.all(repairs.map(async (r) => [r.id, (await repairAmountDue(prisma, r.id)).due] as const)));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl uppercase tracking-wide">Repair history</h1>
        <ButtonLink href="/repairs/book" size="sm">New repair request</ButtonLink>
      </div>
      {paid && <Alert tone="info">Thanks — we're waiting for the payment gateway to confirm your payment. This page will show “Paid” once it is verified.</Alert>}
      {!user.emailVerifiedAt && <Alert tone="warn">Verify your email address to approve quotes and pay online.</Alert>}
      {repairs.length === 0 && <EmptyState title="No repairs yet" action={<ButtonLink href="/repairs/book">Request an assessment</ButtonLink>}>Repair requests you submit while signed in (or with your verified email) appear here.</EmptyState>}
      {repairs.map((r) => {
        const sent = r.quotes.find((q) => q.status === "SENT");
        const accepted = r.quotes.find((q) => q.status === "ACCEPTED");
        const due = dues.get(r.id) ?? 0;
        return (
          <Card key={r.id} className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl uppercase">{r.reference}</p>
                <p className="text-sm text-bone-muted">{r.instrumentType}{r.brand ? ` · ${r.brand}` : ""}{r.model ? ` ${r.model}` : ""} · submitted {fmtDate(r.createdAt)}</p>
              </div>
              <RepairStatusBadge status={r.status} />
            </div>
            {r.status === "DECLINED" && r.declineReason && <Alert tone="danger" title="Request declined">{r.declineReason}</Alert>}
            {r.dropOffDetails && <Alert tone="info" title="Drop-off / appointment (private)"><p className="whitespace-pre-line">{r.dropOffDetails}</p>{r.appointmentAt && <p className="mt-1">When: {fmtDate(r.appointmentAt, true)}</p>}</Alert>}

            {[sent, accepted].filter(Boolean).map((q) => (
              <div key={q!.id} className="rounded-lg border border-ink-400 p-4">
                <p className="font-semibold text-bone">Quote v{q!.version} {q!.status === "ACCEPTED" ? `· accepted ${fmtDate(q!.customerAcceptedAt, true)}` : "· awaiting your decision"}</p>
                <table className="table-base mt-2">
                  <thead><tr><th>Item</th><th>Type</th><th className="text-right">Qty</th><th className="text-right">Amount</th></tr></thead>
                  <tbody>{q!.lineItems.map((l) => <tr key={l.id}><td>{l.description}</td><td>{l.type === "PART" ? "Part (customer pays)" : "Labour"}</td><td className="text-right">{l.quantity}</td><td className="text-right">{formatZAR(l.totalCents)}</td></tr>)}</tbody>
                </table>
                <p className="mt-2 text-right text-sm">Labour {formatZAR(q!.labourCents)} · Parts {formatZAR(q!.partsCents)} · <strong className="text-bone">Total {formatZAR(q!.totalCents)}</strong></p>
                {q!.notes && <p className="mt-2 text-sm text-bone-muted">{q!.notes}</p>}
                <div className="mt-3 grid gap-2 text-sm text-bone-muted sm:grid-cols-2">
                  <p><strong className="text-bone">Warranty:</strong> {q!.warrantyDays ? `${q!.warrantyDays} days. ` : ""}{q!.warrantyTerms ?? "As per repair terms."}</p>
                  <p><strong className="text-bone">Exclusions:</strong> {q!.exclusions ?? "See repair terms."}</p>
                </div>
                {q!.validUntil && q!.status === "SENT" && <p className="mt-2 text-xs text-bone-dim">Valid until {fmtDate(q!.validUntil)}</p>}
                {q!.status === "SENT" && user.emailVerifiedAt && <div className="mt-4"><QuoteResponse quoteId={q!.id} /></div>}
              </div>
            ))}

            {r.status === "PAYMENT_DUE" && due > 0 && (
              <div className="rounded-lg border border-amp/40 bg-amp/10 p-4">
                <p className="font-semibold text-bone">Amount due: {formatZAR(due)}</p>
                <p className="mt-1 text-sm text-bone-muted">Your repair is complete. Pay online by card, or as arranged with us on WhatsApp ({site.whatsappDisplay}).</p>
                {features.payfast() && user.emailVerifiedAt && due >= 500 && (
                  <form action={startRepairPaymentAction} className="mt-3"><input type="hidden" name="repairId" value={r.id} /><Button type="submit">Pay {formatZAR(due)} by card</Button></form>
                )}
              </div>
            )}
            {r.manualPayments.length > 0 && <p className="text-sm text-bone-muted">Payments received: {r.manualPayments.map((p) => `${formatZAR(p.amountCents)} (${fmtDate(p.receivedAt)})`).join(", ")}</p>}
            {r.warranty && <p className="text-sm text-bone-muted">Warranty: {fmtDate(r.warranty.startsAt)} – {fmtDate(r.warranty.endsAt)}. {r.warranty.terms}</p>}

            <details>
              <summary className="cursor-pointer text-sm text-amp">Progress timeline</summary>
              <ol className="mt-3 space-y-2 border-l border-ink-400 pl-5 text-sm">
                {r.statusHistory.map((h) => <li key={h.id}><span className="text-bone">{REPAIR_STATUS_LABELS[h.toStatus]}</span><span className="block text-xs text-bone-dim">{fmtDate(h.createdAt, true)}{h.note ? ` — ${h.note}` : ""}</span></li>)}
              </ol>
            </details>
          </Card>
        );
      })}
      <p className="text-xs text-bone-dim">Questions about a repair? <Link href="/contact" className="link">Contact us</Link>.</p>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { rateLimit, limits } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";
import { REPAIR_FLOW, REPAIR_STATUS_LABELS } from "@/lib/repairs/status";
import { Alert, Card, PageHeader } from "@/components/ui/misc";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { RepairStatusBadge, fmtDate } from "@/components/status-badges";
import { cn } from "@/components/ui/cn";

export const metadata: Metadata = { title: "Track a repair", description: "Check the status of your Guitarz4U repair with your reference and email address.", alternates: { canonical: "/repairs/track" } };

export default async function TrackRepairPage({ searchParams }: { searchParams: Promise<{ ref?: string; email?: string }> }) {
  const { ref, email } = await searchParams;
  let repair = null;
  let error: string | null = null;
  if (ref && email) {
    if (!(await rateLimit(`track:${await clientIp()}`, limits.tracking.limit, limits.tracking.window))) error = "Too many lookups. Please wait a few minutes.";
    else {
      repair = await prisma.repairRequest.findFirst({
        where: { reference: ref.trim().toUpperCase(), email: { equals: email.trim(), mode: "insensitive" } },
        select: { reference: true, status: true, instrumentType: true, createdAt: true, updatedAt: true, statusHistory: { where: { isCustomerVisible: true }, orderBy: { createdAt: "asc" }, select: { id: true, toStatus: true, createdAt: true } } },
      });
      if (!repair) error = "We couldn't find a repair with that reference and email address.";
    }
  }
  const step = repair ? REPAIR_FLOW.indexOf(repair.status) : -1;
  return (
    <>
      <PageHeader eyebrow="Repairs" title="Track a repair">Enter the reference from your confirmation email and the email address you used. Signed-in customers can see full details, quotes and payments in <Link href="/account/repairs" className="link">My repairs</Link>.</PageHeader>
      <div className="container max-w-3xl space-y-6 py-10">
        <Card>
          <form method="get" className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Repair reference" htmlFor="ref" required><Input id="ref" name="ref" defaultValue={ref} placeholder="REP-XXXXXX" required /></Field>
            <Field label="Email address" htmlFor="email" required><Input id="email" name="email" type="email" defaultValue={email} required /></Field>
            <Button type="submit">Track</Button>
          </form>
        </Card>
        {error && <Alert tone="danger">{error}</Alert>}
        {repair && (
          <Card className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-display text-xl uppercase">{repair.reference} · {repair.instrumentType}</p>
              <RepairStatusBadge status={repair.status} />
            </div>
            {step >= 0 && (
              <ol className="grid gap-2 sm:grid-cols-2" aria-label="Repair progress">
                {REPAIR_FLOW.map((s, i) => (
                  <li key={s} className={cn("flex items-center gap-2 text-sm", i <= step ? "text-bone" : "text-bone-dim")}>
                    <span className={cn("grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold", i < step ? "bg-ok text-ink" : i === step ? "bg-amp text-ink" : "bg-ink-500")} aria-hidden="true">{i < step ? "✓" : i + 1}</span>
                    {REPAIR_STATUS_LABELS[s]}{i === step && <span className="sr-only"> (current)</span>}
                  </li>
                ))}
              </ol>
            )}
            <details>
              <summary className="cursor-pointer text-sm text-amp">History</summary>
              <ul className="mt-2 space-y-1 text-sm text-bone-muted">{repair.statusHistory.map((h) => <li key={h.id}>{fmtDate(h.createdAt, true)} — {REPAIR_STATUS_LABELS[h.toStatus]}</li>)}</ul>
            </details>
          </Card>
        )}
      </div>
    </>
  );
}

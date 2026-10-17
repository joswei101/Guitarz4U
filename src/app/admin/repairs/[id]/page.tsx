import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { formatZAR } from "@/lib/money";
import { getSetting } from "@/lib/settings";
import { REPAIR_STATUS_LABELS, REPAIR_TRANSITIONS } from "@/lib/repairs/status";
import { repairAmountDue } from "@/lib/repairs/payments";
import { recordQuoteDecisionAction, recordRepairPaymentAction, repairTransitionAction, saveDropOffAction, sendQuoteAction } from "@/app/actions/admin/repairs";
import { toE164ZA } from "@/lib/whatsapp";
import { AdminHeader, Table } from "@/components/admin/admin-ui";
import { QuoteBuilder } from "@/components/admin/quote-builder";
import { ActionForm } from "@/components/forms/action-form";
import { Alert, Badge, Card } from "@/components/ui/misc";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { RepairStatusBadge, fmtDate } from "@/components/status-badges";

export const metadata = { title: "Repair" };

function toLocalInput(d: Date | null) {
  return d ? new Date(d.getTime() + 2 * 3600000).toISOString().slice(0, 16) : "";
}

export default async function AdminRepair({ params }: { params: Promise<{ id: string }> }) {
  await requirePermissionPage("repairs:manage");
  const { id } = await params;
  const r = await prisma.repairRequest.findUnique({ where: { id }, include: { media: { include: { file: true } }, quotes: { include: { lineItems: true }, orderBy: { version: "desc" } }, statusHistory: { orderBy: { createdAt: "asc" } }, manualPayments: { orderBy: { receivedAt: "asc" } }, warranty: true, user: { select: { email: true } } } });
  if (!r) notFound();
  const [{ quoteTotal, paid, due }, defaultWarranty] = await Promise.all([repairAmountDue(prisma, r.id), getSetting("repairs.defaultWarrantyTerms")]);
  const next = REPAIR_TRANSITIONS[r.status];
  const canQuote = ["ACCEPTED_FOR_ASSESSMENT", "AWAITING_ASSESSMENT", "QUOTE_PREPARED", "AWAITING_CUSTOMER_APPROVAL"].includes(r.status);
  const wa = toE164ZA(r.phone);
  const partsCost = r.quotes.find((q) => q.status === "ACCEPTED")?.lineItems.reduce((s, l) => s + (l.costCents ?? 0) * l.quantity, 0) ?? 0;
  return (
    <div className="max-w-6xl space-y-6">
      <AdminHeader title={`Repair ${r.reference}`} back={{ href: "/admin/repairs", label: "Repairs" }}><RepairStatusBadge status={r.status} /></AdminHeader>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card className="space-y-3 text-sm">
            <h2 className="font-display text-lg uppercase">Request</h2>
            <dl className="grid grid-cols-[150px_1fr] gap-x-3 gap-y-1">
              <dt className="text-bone-dim">Instrument</dt><dd>{r.instrumentType} {[r.brand, r.model].filter(Boolean).join(" ")}</dd>
              <dt className="text-bone-dim">Services</dt><dd>{r.services.join(", ")}</dd>
              <dt className="text-bone-dim">Problem</dt><dd className="whitespace-pre-line">{r.problem}</dd>
              <dt className="text-bone-dim">Notes</dt><dd className="whitespace-pre-line">{r.notes ?? "—"}</dd>
              <dt className="text-bone-dim">Preferred</dt><dd>{fmtDate(r.preferredDate)} {r.preferredTimeNote ?? ""}</dd>
            </dl>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {r.media.map((m) => (
                <li key={m.id}><a href={`/api/files/${m.fileId}`} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded border border-ink-500">
                  {m.file.kind === "IMAGE" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/files/${m.fileId}?v=thumb`} alt="Customer upload" className="aspect-square w-full object-cover" />
                  ) : <span className="grid aspect-square place-items-center bg-ink-600">▶ Video</span>}
                </a></li>
              ))}
            </ul>
          </Card>

          {r.quotes.map((q) => (
            <Card key={q.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg uppercase">Quote v{q.version}</h2>
                <Badge tone={q.status === "ACCEPTED" ? "ok" : q.status === "SENT" ? "amp" : q.status === "DRAFT" ? "warn" : "neutral"}>{q.status.toLowerCase()}</Badge>
              </div>
              <Table>
                <thead><tr><th>Type</th><th>Description</th><th>Qty</th><th>Unit</th><th>Total</th><th>Your cost</th></tr></thead>
                <tbody>{q.lineItems.map((l) => <tr key={l.id}><td>{l.type.toLowerCase()}</td><td>{l.description}</td><td>{l.quantity}</td><td>{formatZAR(l.unitPriceCents)}</td><td>{formatZAR(l.totalCents)}</td><td>{l.costCents != null ? formatZAR(l.costCents * l.quantity) : "—"}</td></tr>)}</tbody>
              </Table>
              <p className="text-right text-sm">Labour {formatZAR(q.labourCents)} · Parts {formatZAR(q.partsCents)} · <strong>Total {formatZAR(q.totalCents)}</strong></p>
              <p className="text-xs text-bone-dim">Warranty: {q.warrantyDays ?? "—"} days · {q.warrantyTerms} · Exclusions: {q.exclusions} {q.sentAt && `· sent ${fmtDate(q.sentAt, true)}`} {q.customerAcceptedAt && `· accepted ${fmtDate(q.customerAcceptedAt, true)}${q.acceptedIp ? ` (online)` : ""}`}</p>
              {q.status === "DRAFT" && (
                <ActionForm action={sendQuoteAction} submitLabel="Approve & send to customer" className="space-y-3">
                  <input type="hidden" name="quoteId" value={q.id} />
                  <Checkbox id={`insp-${q.id}`} name="inspected" required label="I have inspected the instrument and approve this quote." />
                </ActionForm>
              )}
              {q.status === "SENT" && (
                <details>
                  <summary className="cursor-pointer text-sm text-amp">Record customer&apos;s decision received offline (WhatsApp/email)</summary>
                  <ActionForm action={recordQuoteDecisionAction} submitLabel="Record decision" variant="subtle" className="mt-3 space-y-3">
                    <input type="hidden" name="quoteId" value={q.id} />
                    <Select name="decision" aria-label="Decision"><option value="accept">Customer accepted</option><option value="decline">Customer declined</option></Select>
                    <Field label="How did they confirm? (required)" htmlFor={`dn-${q.id}`} required><Input id={`dn-${q.id}`} name="note" required placeholder="e.g. WhatsApp message 12 Oct 14:05" /></Field>
                  </ActionForm>
                </details>
              )}
            </Card>
          ))}

          {canQuote && (
            <Card>
              <h2 className="mb-3 font-display text-lg uppercase">{r.quotes.length ? "Prepare a revised quote" : "Prepare quote"}</h2>
              <p className="mb-3 text-xs text-bone-dim">Saving creates a draft (replacing any unsent draft). Nothing is sent until you approve it.</p>
              <QuoteBuilder repairId={r.id} defaultWarranty={defaultWarranty} />
            </Card>
          )}

          <Card>
            <h2 className="font-display text-lg uppercase">Status history</h2>
            <ol className="mt-3 space-y-2 border-l border-ink-400 pl-5 text-sm">
              {r.statusHistory.map((h) => <li key={h.id}><span className="text-bone">{REPAIR_STATUS_LABELS[h.toStatus]}</span>{!h.isCustomerVisible && <Badge className="ml-2">internal</Badge>}<span className="block text-xs text-bone-dim">{fmtDate(h.createdAt, true)}{h.note ? ` — ${h.note}` : ""}</span></li>)}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-1 text-sm">
            <h2 className="font-display text-lg uppercase">Customer</h2>
            <p>{r.name} {r.user ? <Badge tone="ok">account</Badge> : <Badge>guest</Badge>}</p>
            <p><a className="link" href={`mailto:${r.email}?subject=${encodeURIComponent(`Your Guitarz4U repair ${r.reference}`)}`}>{r.email}</a></p>
            <p>{r.phone} {wa && <a className="link ml-2" href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi ${r.name.split(" ")[0]}, this is Guitarz4U about repair ${r.reference}.`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}</p>
          </Card>
          <Card>
            <h2 className="font-display text-lg uppercase">Update status</h2>
            <ActionForm action={repairTransitionAction} submitLabel="Update status" className="mt-3 space-y-3">
              <input type="hidden" name="id" value={r.id} />
              <Select name="status" aria-label="New status">
                {next.length > 0 && <optgroup label="Next steps">{next.map((s) => <option key={s} value={s}>{REPAIR_STATUS_LABELS[s]}</option>)}</optgroup>}
                <optgroup label="Override (reason required)">{Object.entries(REPAIR_STATUS_LABELS).filter(([k]) => k !== r.status && !next.includes(k as never)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</optgroup>
              </Select>
              <Field label="Note / reason (sent to customer unless internal)" htmlFor="note"><Textarea id="note" name="note" className="min-h-16" /></Field>
              <Checkbox id="override" name="override" label="Override normal flow (correction)" />
              <Checkbox id="internal" name="internal" label="Internal note only (don't show the note to the customer)" />
            </ActionForm>
            <p className="mt-2 text-xs text-bone-dim">Rules always enforced: work can&apos;t start without an accepted quote; “Paid” is set automatically once payments cover the quote. Declining requires a reason.</p>
          </Card>
          <Card>
            <h2 className="font-display text-lg uppercase">Payment</h2>
            <p className="mt-2 text-sm">Quote {formatZAR(quoteTotal)} · Paid {formatZAR(paid)} · <strong className={due ? "text-amp" : ""}>Due {formatZAR(due)}</strong></p>
            {partsCost > 0 && <p className="text-xs text-bone-dim">Recorded parts/labour cost: {formatZAR(partsCost)}</p>}
            <ul className="mt-2 space-y-1 text-xs text-bone-muted">{r.manualPayments.map((p) => <li key={p.id}>{fmtDate(p.receivedAt, true)} · {formatZAR(p.amountCents)} · {p.method.replace(/_/g, " ").toLowerCase()}{p.reference ? ` · ${p.reference}` : ""}</li>)}</ul>
            {due > 0 && quoteTotal > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-amp">Record an in-person / EFT payment</summary>
                <ActionForm action={recordRepairPaymentAction} submitLabel="Record payment" className="mt-3 space-y-3">
                  <input type="hidden" name="id" value={r.id} />
                  <Field label="Amount (R)" htmlFor="pamount" required><Input id="pamount" name="amount" defaultValue={(due / 100).toFixed(2)} required /></Field>
                  <Field label="Method" htmlFor="method"><Select id="method" name="method"><option value="CARD_IN_PERSON">Card (in person)</option><option value="EFT">EFT</option><option value="CASH">Cash</option></Select></Field>
                  <Field label="Reference" htmlFor="pref"><Input id="pref" name="reference" /></Field>
                </ActionForm>
              </details>
            )}
            {r.status === "PAYMENT_DUE" && <p className="mt-2 text-xs text-bone-dim">The customer can also pay online by card from their account (if they have one).</p>}
            {r.warranty && <Alert tone="info" className="mt-3">Warranty {fmtDate(r.warranty.startsAt)} – {fmtDate(r.warranty.endsAt)}</Alert>}
          </Card>
          <Card>
            <h2 className="font-display text-lg uppercase">Private arrangements</h2>
            <ActionForm action={saveDropOffAction} submitLabel="Save" variant="subtle" className="mt-3 space-y-3">
              <input type="hidden" name="id" value={r.id} />
              <Field label="Drop-off / collection details (visible only to this customer)" htmlFor="dropOffDetails"><Textarea id="dropOffDetails" name="dropOffDetails" defaultValue={r.dropOffDetails ?? ""} /></Field>
              <Field label="Appointment" htmlFor="appointmentAt"><Input id="appointmentAt" name="appointmentAt" type="datetime-local" defaultValue={toLocalInput(r.appointmentAt)} /></Field>
              <Field label="Internal notes" htmlFor="internalNotes"><Textarea id="internalNotes" name="internalNotes" defaultValue={r.internalNotes ?? ""} className="min-h-16" /></Field>
              <Checkbox id="notifyd" name="notify" label="Notify customer that arrangements are ready" />
            </ActionForm>
          </Card>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { formatZAR } from "@/lib/money";
import { canNegotiate, ENQUIRY_STATUS_LABELS, isClosed } from "@/lib/enquiries/status";
import { toE164ZA } from "@/lib/whatsapp";
import { convertEnquiryAction, enquiryActionAction } from "@/app/actions/admin/enquiries";
import { AdminHeader, Table } from "@/components/admin/admin-ui";
import { ActionForm } from "@/components/forms/action-form";
import { Alert, Badge, Card } from "@/components/ui/misc";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { EnquiryStatusBadge, fmtDate } from "@/components/status-badges";

export const metadata = { title: "Purchase enquiry" };

function ActionBox({ id, kind, label, amount, message, messageLabel, variant }: { id: string; kind: string; label: string; amount?: boolean; message?: "required" | "optional"; messageLabel?: string; variant?: "primary" | "outline" | "danger" | "subtle" }) {
  return (
    <ActionForm action={enquiryActionAction} submitLabel={label} variant={variant} className="space-y-3 rounded-lg border border-ink-500 p-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      {amount && <Field label="Amount (R)" htmlFor={`${kind}-amount`} required><Input id={`${kind}-amount`} name="amount" inputMode="decimal" required /></Field>}
      {message && <Field label={messageLabel ?? "Message"} htmlFor={`${kind}-msg`} required={message === "required"}><Textarea id={`${kind}-msg`} name="message" required={message === "required"} className="min-h-20" /></Field>}
    </ActionForm>
  );
}

export default async function EnquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePermissionPage("enquiries:manage");
  const { id } = await params;
  const e = await prisma.purchaseEnquiry.findUnique({ where: { id }, include: { media: { include: { file: true } }, offers: { orderBy: { createdAt: "asc" } }, events: { orderBy: { createdAt: "asc" } }, product: true, user: { select: { id: true, email: true } } } });
  if (!e) notFound();
  const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const openBusinessOffer = e.offers.find((o) => o.status === "OPEN" && o.party === "BUSINESS");
  const openCounter = e.offers.find((o) => o.status === "OPEN" && o.party === "SELLER");
  const wa = toE164ZA(e.phone);
  return (
    <div className="max-w-6xl space-y-6">
      <AdminHeader title={`Enquiry ${e.reference}`} back={{ href: "/admin/enquiries", label: "Purchase enquiries" }}><EnquiryStatusBadge status={e.status} /></AdminHeader>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card className="space-y-3">
            <h2 className="font-display text-lg uppercase">Item</h2>
            <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-bone-dim">Type</dt><dd>{e.instrumentType}</dd>
              <dt className="text-bone-dim">Brand / model</dt><dd>{e.brand ?? "—"} {e.model ?? ""}</dd>
              <dt className="text-bone-dim">Condition</dt><dd>{e.condition}</dd>
              <dt className="text-bone-dim">Faults</dt><dd className="whitespace-pre-line">{e.faults ?? "—"}</dd>
              <dt className="text-bone-dim">Details</dt><dd className="whitespace-pre-line">{e.details ?? "—"}</dd>
              {e.agreedPriceCents != null && <><dt className="text-bone-dim">Agreed price</dt><dd className="text-amp">{formatZAR(e.agreedPriceCents)}</dd></>}
            </dl>
            <p className="pt-2 text-xs text-bone-dim">Private uploads — visible only to staff and the seller.</p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {e.media.map((m) => (
                <li key={m.id}>
                  <a href={`/api/files/${m.fileId}`} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-ink-500">
                    {m.file.kind === "IMAGE" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/files/${m.fileId}?v=thumb`} alt="Seller upload" className="aspect-square w-full object-cover" />
                    ) : <span className="grid aspect-square place-items-center bg-ink-600 text-sm">▶ Video</span>}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="font-display text-lg uppercase">Offers & negotiation</h2>
            {e.offers.length === 0 ? <p className="mt-2 text-sm text-bone-muted">No offers yet.</p> : (
              <div className="mt-3"><Table>
                <thead><tr><th>Date</th><th>From</th><th>Amount</th><th>Status</th><th>Message</th></tr></thead>
                <tbody>{e.offers.map((o) => <tr key={o.id}><td className="whitespace-nowrap">{fmtDate(o.createdAt, true)}</td><td>{o.party === "BUSINESS" ? "Guitarz4U" : "Seller"}</td><td>{formatZAR(o.amountCents)}</td><td><Badge tone={o.status === "ACCEPTED" ? "ok" : o.status === "OPEN" ? "amp" : "neutral"}>{o.status.toLowerCase()}</Badge></td><td className="text-xs">{o.message}</td></tr>)}</tbody>
              </Table></div>
            )}
          </Card>
          <Card>
            <h2 className="font-display text-lg uppercase">History</h2>
            <ol className="mt-3 space-y-2 border-l border-ink-400 pl-5 text-sm">
              {e.events.map((ev) => (
                <li key={ev.id}><span className="text-bone">{ev.toStatus ? ENQUIRY_STATUS_LABELS[ev.toStatus] : ev.type.replace(/_/g, " ")}</span>{ev.isCustomerVisible && <Badge className="ml-2">sent to seller</Badge>}<span className="block text-xs text-bone-dim">{fmtDate(ev.createdAt, true)}{ev.message ? ` — ${ev.message}` : ""}</span></li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="space-y-2 text-sm">
            <h2 className="font-display text-lg uppercase">Seller</h2>
            <p>{e.name}</p>
            <p><a className="link" href={`mailto:${e.email}?subject=${encodeURIComponent(`Your Guitarz4U submission ${e.reference}`)}`}>{e.email}</a></p>
            <p>{e.phone} {wa && <a className="link ml-2" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi ${e.name.split(" ")[0]}, this is Guitarz4U regarding your submission ${e.reference}.`)}`}>WhatsApp</a>}</p>
            <p className="text-xs text-bone-dim">Received {fmtDate(e.createdAt, true)} · consent recorded {fmtDate(e.privacyConsentAt)}{e.user ? " · linked to account" : " · guest"}</p>
          </Card>
          {e.product && <Alert tone="ok">Converted to inventory: <Link href={`/admin/products/${e.product.id}`}>{e.product.title}</Link></Alert>}
          {!isClosed(e.status) && (
            <div className="space-y-3">
              {e.status === "SUBMITTED" && <ActionBox id={e.id} kind="review" label="Mark as under review" variant="subtle" />}
              {canNegotiate(e.status) && <ActionBox id={e.id} kind="make_offer" label={openBusinessOffer ? "Make revised offer" : "Make an offer"} amount message="optional" messageLabel="Message to seller (emailed)" />}
              {openBusinessOffer && <ActionBox id={e.id} kind="seller_accepted" label="Seller accepted our offer" message="optional" messageLabel="Note (how they confirmed)" variant="subtle" />}
              {openBusinessOffer && <ActionBox id={e.id} kind="seller_declined" label="Seller declined our offer" message="optional" messageLabel="Note" variant="subtle" />}
              {canNegotiate(e.status) && <ActionBox id={e.id} kind="record_counter" label="Record seller's counter-offer" amount message="optional" messageLabel="Note" variant="subtle" />}
              {openCounter && <ActionBox id={e.id} kind="accept_counter" label={`Accept counter-offer (${formatZAR(openCounter.amountCents)})`} message="optional" messageLabel="Message to seller (emailed)" />}
              {e.status === "OFFER_ACCEPTED" && <ActionBox id={e.id} kind="complete_purchase" label="Record completed purchase" amount message="optional" messageLabel="Notes (payment method, date, handover)" />}
              {canNegotiate(e.status) && <ActionBox id={e.id} kind="request_info" label="Request more information" message="required" messageLabel="What do you need? (emailed to seller)" variant="outline" />}
              {e.status !== "PURCHASE_COMPLETED" && <ActionBox id={e.id} kind="decline" label="Decline submission" message="optional" messageLabel="Reason (emailed to seller)" variant="danger" />}
            </div>
          )}
          {e.status === "PURCHASE_COMPLETED" && (
            <Card>
              <h2 className="font-display text-lg uppercase">Add to inventory</h2>
              <p className="mt-1 text-sm text-bone-muted">Creates a hidden draft with the purchase price recorded as acquisition cost. You&apos;ll add your own photos, description and price before publishing.</p>
              <ActionForm action={convertEnquiryAction} submitLabel="Create draft product" className="mt-3 space-y-3">
                <input type="hidden" name="id" value={e.id} />
                <Field label="Listing title" htmlFor="title" required><Input id="title" name="title" required defaultValue={[e.brand, e.model].filter(Boolean).join(" ") || e.instrumentType} /></Field>
                <Field label="Category" htmlFor="categoryId" required><Select id="categoryId" name="categoryId" required defaultValue="">{[<option key="" value="" disabled>Choose…</option>, ...categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)]}</Select></Field>
              </ActionForm>
            </Card>
          )}
          <ActionBox id={e.id} kind="note" label="Add internal note" message="required" messageLabel="Internal note (not sent)" variant="subtle" />
        </div>
      </div>
    </div>
  );
}

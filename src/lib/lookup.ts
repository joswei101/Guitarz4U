import { query, queryOne } from "./db";
import { getHistory, type EntityType } from "./workflow";
import { PURCHASE_STATUSES, RESERVATION_STATUSES, SELLER_STATUSES, REPAIR_STATUSES } from "./format";

export type PublicStatusView = {
  kind: EntityType;
  kindLabel: string;
  reference: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  customerUpdate: string;
  summary: string[];
  timeline: { status: string; label: string; note: string; at: string }[];
  offer?: { amountCents: number; message: string; status: string } | null;
  quote?: { amountCents: number | null; message: string; response: string | null } | null;
  confirmedDate?: string | null;
};

const digits = (s: string) => s.replace(/\D/g, "").replace(/^27/, "0");

/**
 * Looks up a request by reference + the email or phone used on it. Returns only
 * customer-safe fields — never admin notes, serial numbers or other customers' data.
 */
export async function lookupByReference(reference: string, contact: string): Promise<PublicStatusView | null> {
  const ref = reference.trim().toUpperCase();
  const c = contact.trim().toLowerCase();
  const matches = (email: string, phone: string) =>
    (c.includes("@") && email.toLowerCase() === c) || (!c.includes("@") && digits(c).length >= 9 && digits(phone) === digits(c));

  if (ref.startsWith("G4U-PR-")) {
    const r = await queryOne<{ id: string; reference: string; status: string; created_at: Date; customer_update: string; contact_email: string; contact_phone: string; estimated_total_cents: number }>(
      "select id, reference, status, created_at, customer_update, contact_email, contact_phone, estimated_total_cents from purchase_requests where reference=$1",
      [ref],
    );
    if (!r || !matches(r.contact_email, r.contact_phone)) return null;
    const items = await query<{ title_snapshot: string }>("select title_snapshot from purchase_request_items where purchase_request_id=$1", [r.id]);
    return build("purchase_request", "Purchase request", r, PURCHASE_STATUSES, items.map((i) => i.title_snapshot));
  }
  if (ref.startsWith("G4U-RS-")) {
    const r = await queryOne<{ id: string; reference: string; status: string; created_at: Date; customer_update: string; contact_email: string; contact_phone: string; title: string; expires_at: Date | null }>(
      "select r.id, r.reference, r.status, r.created_at, r.customer_update, r.contact_email, r.contact_phone, p.title, r.expires_at from reservations r join products p on p.id=r.product_id where r.reference=$1",
      [ref],
    );
    if (!r || !matches(r.contact_email, r.contact_phone)) return null;
    const summary = [r.title];
    if (r.status === "approved" && r.expires_at) summary.push(`Held until ${r.expires_at.toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}`);
    return build("reservation", "Reservation", r, RESERVATION_STATUSES, summary);
  }
  if (ref.startsWith("G4U-SL-")) {
    const r = await queryOne<{ id: string; reference: string; status: string; created_at: Date; customer_update: string; email: string; contact_phone: string; brand: string; model: string }>(
      "select id, reference, status, created_at, customer_update, email, contact_phone, brand, model from seller_submissions where reference=$1",
      [ref],
    );
    if (!r || !matches(r.email, r.contact_phone)) return null;
    const v = await build("seller_submission", "Guitar submission", r, SELLER_STATUSES, [`${r.brand} ${r.model}`.trim()]);
    const offer = await queryOne<{ amount_cents: number; message: string; status: string }>(
      "select amount_cents, message, status from seller_offers where submission_id=$1 and status <> 'withdrawn' order by created_at desc limit 1",
      [r.id],
    );
    v.offer = offer ? { amountCents: offer.amount_cents, message: offer.message, status: offer.status } : null;
    return v;
  }
  if (ref.startsWith("G4U-RP-")) {
    const r = await queryOne<{ id: string; reference: string; status: string; created_at: Date; customer_update: string; email: string; contact_phone: string; guitar_brand: string; guitar_model: string; quote_amount_cents: number | null; quote_message: string; quote_provided_at: Date | null; quote_response: string | null; confirmed_date: Date | null }>(
      "select id, reference, status, created_at, customer_update, email, contact_phone, guitar_brand, guitar_model, quote_amount_cents, quote_message, quote_provided_at, quote_response, confirmed_date from repair_bookings where reference=$1",
      [ref],
    );
    if (!r || !matches(r.email, r.contact_phone)) return null;
    const v = await build("repair_booking", "Repair booking", r, REPAIR_STATUSES, [`${r.guitar_brand} ${r.guitar_model}`.trim()]);
    v.quote = r.quote_provided_at ? { amountCents: r.quote_amount_cents, message: r.quote_message, response: r.quote_response } : null;
    v.confirmedDate = r.confirmed_date ? r.confirmed_date.toISOString().slice(0, 10) : null;
    return v;
  }
  return null;
}

async function build(
  kind: EntityType,
  kindLabel: string,
  r: { id: string; reference: string; status: string; created_at: Date; customer_update: string },
  labels: Record<string, string>,
  summary: string[],
): Promise<PublicStatusView> {
  const history = await getHistory(kind, r.id);
  return {
    kind,
    kindLabel,
    reference: r.reference,
    status: r.status,
    statusLabel: labels[r.status] ?? r.status,
    createdAt: r.created_at.toISOString(),
    customerUpdate: r.customer_update,
    summary,
    timeline: history.map((h) => ({ status: h.status, label: labels[h.status] ?? h.status, note: h.public_note, at: h.created_at.toISOString() })),
  };
}

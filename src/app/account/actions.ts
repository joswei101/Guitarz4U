"use server";
// Customer-side actions. Every action re-checks the session and ownership on the
// server — the browser can never act on someone else's records.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { query, queryOne, transaction } from "@/lib/db";
import { addHistory } from "@/lib/workflow";
import { notifyAdmin } from "@/lib/notify";
import { phoneSchema, contactMethod } from "@/lib/validation";
import { formatRand } from "@/lib/format";
import { releaseIfFree } from "@/lib/inventory";
import { sendAvailabilityAlerts } from "@/lib/alerts";

const id = z.uuid();

export async function cancelPurchaseRequest(form: FormData) {
  const user = await requireUser();
  const rid = id.parse(form.get("id"));
  const r = await queryOne<{ reference: string; status: string }>(
    "select reference, status from purchase_requests where id=$1 and user_id=$2",
    [rid, user.id],
  );
  if (!r || !["submitted", "under_review", "awaiting_customer", "approved", "awaiting_eft"].includes(r.status)) {
    redirect(`/account/requests/${rid}?msg=notallowed`);
  }
  const released = await transaction(async (c) => {
    await c.query("update purchase_requests set status='cancelled' where id=$1", [rid]);
    await addHistory("purchase_request", rid, "cancelled", "Cancelled by the customer.", user.id, c);
    const items = await c.query<{ product_id: string }>("select product_id from purchase_request_items where purchase_request_id=$1 and product_id is not null", [rid]);
    return releaseIfFree(c, items.rows.map((i) => i.product_id), rid);
  });
  await sendAvailabilityAlerts(released);
  await notifyAdmin("purchase_request", `Request ${r!.reference} cancelled by customer`, `${user.name} cancelled purchase request ${r!.reference}.${released.length ? " Guitars held for this request were returned to the shop." : ""}`, `/admin/requests/${rid}`);
  revalidatePath("/account/requests");
  redirect(`/account/requests/${rid}?msg=cancelled`);
}

export async function cancelReservation(form: FormData) {
  const user = await requireUser();
  const rid = id.parse(form.get("id"));
  const r = await queryOne<{ reference: string; status: string; product_id: string }>(
    "select reference, status, product_id from reservations where id=$1 and user_id=$2",
    [rid, user.id],
  );
  if (!r || !["requested", "approved"].includes(r.status)) redirect("/account/reservations?msg=notallowed");
  const released = await transaction(async (c) => {
    await c.query("update reservations set status='cancelled' where id=$1", [rid]);
    await addHistory("reservation", rid, "cancelled", "Cancelled by the customer.", user.id, c);
    return r!.status === "approved" ? releaseIfFree(c, [r!.product_id]) : [];
  });
  await sendAvailabilityAlerts(released);
  await notifyAdmin("reservation", `Reservation ${r!.reference} cancelled`, `${user.name} cancelled reservation ${r!.reference}.`, "/admin/reservations");
  revalidatePath("/account/reservations");
  redirect("/account/reservations?msg=cancelled");
}

export async function respondToOffer(form: FormData) {
  const user = await requireUser();
  const offerId = id.parse(form.get("offerId"));
  const accept = form.get("response") === "accept";
  const o = await queryOne<{ submission_id: string; amount_cents: number; reference: string }>(
    `select o.submission_id, o.amount_cents, s.reference from seller_offers o join seller_submissions s on s.id=o.submission_id
     where o.id=$1 and s.user_id=$2 and o.status='pending'`,
    [offerId, user.id],
  );
  if (!o) redirect("/account/submissions?msg=notallowed");
  const status = accept ? "offer_accepted" : "offer_declined";
  await transaction(async (c) => {
    await c.query("update seller_offers set status=$1, responded_at=now() where id=$2", [accept ? "accepted" : "declined", offerId]);
    await c.query("update seller_submissions set status=$1 where id=$2", [status, o!.submission_id]);
    await addHistory(
      "seller_submission",
      o!.submission_id,
      status,
      accept
        ? `You accepted the offer of ${formatRand(o!.amount_cents)}. Guitarz4U will contact you to arrange an inspection and payment. The sale is final only after inspection.`
        : `You declined the offer of ${formatRand(o!.amount_cents)}.`,
      user.id,
      c,
    );
  });
  await notifyAdmin("offer", `Offer ${accept ? "ACCEPTED" : "declined"} (${o!.reference})`, `${user.name} ${accept ? "accepted" : "declined"} your offer of ${formatRand(o!.amount_cents)}.`, `/admin/submissions/${o!.submission_id}`);
  revalidatePath("/account/submissions");
  redirect(`/account/submissions?msg=${accept ? "accepted" : "declined"}`);
}

export async function withdrawSubmission(form: FormData) {
  const user = await requireUser();
  const sid = id.parse(form.get("id"));
  const s = await queryOne<{ reference: string; status: string }>("select reference, status from seller_submissions where id=$1 and user_id=$2", [sid, user.id]);
  if (!s || ["purchased", "rejected", "withdrawn"].includes(s.status)) redirect("/account/submissions?msg=notallowed");
  await transaction(async (c) => {
    await c.query("update seller_submissions set status='withdrawn' where id=$1", [sid]);
    await c.query("update seller_offers set status='withdrawn' where submission_id=$1 and status='pending'", [sid]);
    await addHistory("seller_submission", sid, "withdrawn", "Withdrawn by the seller.", user.id, c);
  });
  await notifyAdmin("seller_submission", `Submission ${s!.reference} withdrawn`, `${user.name} withdrew their guitar submission.`, `/admin/submissions/${sid}`);
  redirect("/account/submissions?msg=cancelled");
}

export async function respondToQuote(form: FormData) {
  const user = await requireUser();
  const rid = id.parse(form.get("id"));
  const accept = form.get("response") === "accept";
  const r = await queryOne<{ reference: string; quote_amount_cents: number | null }>(
    "select reference, quote_amount_cents from repair_bookings where id=$1 and user_id=$2 and status='quote_provided' and quote_response is null",
    [rid, user.id],
  );
  if (!r) redirect("/account/repairs?msg=notallowed");
  await transaction(async (c) => {
    await c.query("update repair_bookings set quote_response=$1, quote_responded_at=now() where id=$2", [accept ? "accepted" : "declined", rid]);
    await addHistory(
      "repair_booking",
      rid,
      "quote_provided",
      accept ? "You accepted the quote. Guitarz4U will confirm the drop-off date with you before starting work." : "You declined the quote.",
      user.id,
      c,
    );
  });
  await notifyAdmin("repair_booking", `Repair quote ${accept ? "ACCEPTED" : "declined"} (${r!.reference})`, `${user.name} ${accept ? "accepted" : "declined"} the quote${r!.quote_amount_cents !== null ? ` of ${formatRand(r!.quote_amount_cents)}` : ""}.`, `/admin/repairs/${rid}`);
  redirect(`/account/repairs?msg=${accept ? "accepted" : "declined"}`);
}

export async function cancelRepair(form: FormData) {
  const user = await requireUser();
  const rid = id.parse(form.get("id"));
  const r = await queryOne<{ reference: string; status: string }>("select reference, status from repair_bookings where id=$1 and user_id=$2", [rid, user.id]);
  if (!r || !["submitted", "awaiting_review", "awaiting_info", "quote_provided"].includes(r.status)) redirect("/account/repairs?msg=notallowed");
  await transaction(async (c) => {
    await c.query("update repair_bookings set status='cancelled' where id=$1", [rid]);
    await addHistory("repair_booking", rid, "cancelled", "Cancelled by the customer.", user.id, c);
  });
  await notifyAdmin("repair_booking", `Repair ${r!.reference} cancelled`, `${user.name} cancelled their repair booking.`, `/admin/repairs/${rid}`);
  redirect("/account/repairs?msg=cancelled");
}

export async function markNotificationsRead() {
  const user = await requireUser();
  await query("update notifications set read_at=now() where user_id=$1 and audience='user' and read_at is null", [user.id]);
  revalidatePath("/account", "layout");
  redirect("/account/notifications");
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  preferredContact: contactMethod,
});

export async function updateProfile(form: FormData) {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({ name: form.get("name"), phone: form.get("phone") ?? "", preferredContact: form.get("preferredContact") });
  if (!parsed.success) redirect("/account/profile?msg=error");
  const d = parsed.data;
  await query('update "user" set name=$1, "updatedAt"=now() where id=$2', [d.name, user.id]);
  await query(
    `insert into customer_profiles (user_id, phone, preferred_contact) values ($1,$2,$3)
     on conflict (user_id) do update set phone=excluded.phone, preferred_contact=excluded.preferred_contact`,
    [user.id, d.phone, d.preferredContact],
  );
  revalidatePath("/account", "layout");
  redirect("/account/profile?msg=saved");
}

export async function requestDataAction(form: FormData) {
  const user = await requireUser();
  const kind = form.get("kind") === "deletion" ? "deletion" : "export";
  const details = String(form.get("details") ?? "").slice(0, 2000);
  const open = await queryOne("select 1 from data_requests where user_id=$1 and kind=$2 and status='pending'", [user.id, kind]);
  if (!open) {
    await query("insert into data_requests (user_id, kind, details) values ($1,$2,$3)", [user.id, kind, details]);
    await notifyAdmin("data_request", `Account ${kind} request`, `${user.name} (${user.email}) requested ${kind === "deletion" ? "deletion of their account" : "a copy of their data"}.`, "/admin/data-requests");
  }
  redirect("/account/privacy?msg=requested");
}

"use server";
// Administrator actions. EVERY function starts with requireAdmin() (server-side
// role check) and records important changes in the append-only audit log.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, type CurrentUser } from "@/lib/session";
import { query, queryOne, transaction } from "@/lib/db";
import { audit } from "@/lib/audit";
import { addHistory } from "@/lib/workflow";
import { notifyCustomer } from "@/lib/notify";
import { releaseIfFree } from "@/lib/inventory";
import { sendAvailabilityAlerts } from "@/lib/alerts";
import { processAndStoreImage, getImageFiles, UploadError } from "@/lib/images";
import { deleteObject } from "@/lib/storage";
import { DEFAULT_SETTINGS, SETTING_KEYS, getSettings } from "@/lib/settings";
import {
  PURCHASE_STATUSES, RESERVATION_STATUSES, SELLER_STATUSES, REPAIR_STATUSES,
  formatRand, parseRandToCents, slugify, type PurchaseStatus,
} from "@/lib/format";
import { conditionSchema } from "@/lib/validation";

const uuid = z.uuid();
const str = (f: FormData, k: string, max = 8000) => String(f.get(k) ?? "").trim().slice(0, max);
const go = (path: string, msg = "saved"): never => redirect(`${path}${path.includes("?") ? "&" : "?"}msg=${msg}`);

// ───────────────────────────── Products ─────────────────────────────

const productSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(140),
  brand: z.string().trim().max(80),
  model: z.string().trim().max(120),
  categoryId: z.coerce.number().int().positive(),
  price: z.string().trim(),
  compareAt: z.string().trim(),
  condition: conditionSchema,
  description: z.string().max(8000),
  defects: z.string().max(4000),
  history: z.string().max(4000),
  serialNumber: z.string().trim().max(80),
  status: z.enum(["draft", "published", "reserved", "sold", "archived"]),
  featured: z.boolean(),
});

async function brandId(name: string): Promise<number | null> {
  if (!name) return null;
  const slug = slugify(name) || "brand";
  const row = await queryOne<{ id: number }>(
    `insert into brands (name, slug) values ($1,$2) on conflict (slug) do update set name=brands.name returning id`,
    [name, slug],
  );
  return row?.id ?? null;
}

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "guitar";
  let slug = root;
  for (let i = 2; ; i++) {
    const hit = await queryOne("select 1 from products where slug=$1 and ($2::uuid is null or id<>$2::uuid)", [slug, excludeId ?? null]);
    if (!hit) return slug;
    slug = `${root}-${i}`;
  }
}

function parseProduct(form: FormData) {
  const d = productSchema.parse({
    title: form.get("title"), brand: form.get("brand") ?? "", model: form.get("model") ?? "",
    categoryId: form.get("categoryId"), price: form.get("price") ?? "", compareAt: form.get("compareAt") ?? "",
    condition: form.get("condition"), description: str(form, "description"), defects: str(form, "defects"),
    history: str(form, "history"), serialNumber: form.get("serialNumber") ?? "", status: form.get("status") ?? "draft",
    featured: form.get("featured") === "on",
  });
  const price = parseRandToCents(d.price);
  if (price === null) throw new UploadError("Please enter a valid price in rand.");
  const compareAt = d.compareAt ? parseRandToCents(d.compareAt) : null;
  if (d.compareAt && (compareAt === null || compareAt <= price)) throw new UploadError("The 'was' price must be higher than the current price.");
  return { ...d, price, compareAt };
}

async function saveImages(admin: CurrentUser, productId: string, form: FormData) {
  const files = getImageFiles(form, "images", 12);
  const existing = await queryOne<{ n: number; max: number | null }>("select count(*)::int n, max(sort_order) max from product_images where product_id=$1", [productId]);
  if ((existing?.n ?? 0) + files.length > 20) throw new UploadError("A product can have at most 20 photos.");
  let order = (existing?.max ?? -1) + 1;
  for (const f of files) {
    const img = await processAndStoreImage(f, "public", "products");
    await query("insert into product_images (product_id, storage_key, width, height, sort_order, alt_text) values ($1,$2,$3,$4,$5,'')", [productId, img.key, img.width, img.height, order++]);
  }
  if (files.length) await audit(admin, "product.images_added", "product", productId, { count: files.length });
}

export async function createProduct(form: FormData) {
  const admin = await requireAdmin();
  let id: string;
  try {
    const d = parseProduct(form);
    const slug = await uniqueSlug(d.title);
    const row = await queryOne<{ id: string }>(
      `insert into products (slug, title, brand_id, model, category_id, price_cents, compare_at_price_cents, condition, description, defects, history, serial_number, status, featured, published_at, sold_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, case when $13 in ('published','reserved') then now() end, case when $13='sold' then now() end) returning id`,
      [slug, d.title, await brandId(d.brand), d.model, d.categoryId, d.price, d.compareAt, d.condition, d.description, d.defects, d.history, d.serialNumber || null, d.status, d.featured],
    );
    id = row!.id;
    await audit(admin, "product.create", "product", id, { title: d.title, status: d.status, priceCents: d.price });
    await saveImages(admin, id, form);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0].message : err instanceof UploadError ? err.message : "Could not save the product.";
    if (!(err instanceof z.ZodError || err instanceof UploadError)) console.error(err);
    redirect(`/admin/products/new?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/shop");
  go(`/admin/products/${id!}`, "created");
}

export async function updateProduct(form: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  let released: string[] = [];
  try {
    const d = parseProduct(form);
    const before = await queryOne<{ status: string; price_cents: number; title: string }>("select status, price_cents, title from products where id=$1", [id]);
    if (!before) redirect("/admin/products");
    const slug = before!.title !== d.title ? await uniqueSlug(d.title, id) : null;
    await query(
      `update products set title=$2, brand_id=$3, model=$4, category_id=$5, price_cents=$6, compare_at_price_cents=$7, condition=$8,
         description=$9, defects=$10, history=$11, serial_number=$12, status=$13, featured=$14,
         slug=coalesce($15, slug),
         published_at = case when $13 in ('published','reserved') and published_at is null then now() else published_at end,
         sold_at = case when $13='sold' then coalesce(sold_at, now()) else null end
       where id=$1`,
      [id, d.title, await brandId(d.brand), d.model, d.categoryId, d.price, d.compareAt, d.condition, d.description, d.defects, d.history, d.serialNumber || null, d.status, d.featured, slug],
    );
    await audit(admin, "product.update", "product", id, {
      title: d.title,
      ...(before!.status !== d.status ? { statusFrom: before!.status, statusTo: d.status } : {}),
      ...(before!.price_cents !== d.price ? { priceFrom: before!.price_cents, priceTo: d.price } : {}),
    });
    if (before!.status !== "published" && d.status === "published") released = [id];
    await saveImages(admin, id, form);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err; // let Next.js redirects through
    const msg = err instanceof z.ZodError ? err.issues[0].message : err instanceof UploadError ? err.message : "Could not save the product.";
    if (!(err instanceof z.ZodError || err instanceof UploadError)) console.error(err);
    redirect(`/admin/products/${id}?error=${encodeURIComponent(msg)}`);
  }
  await sendAvailabilityAlerts(released);
  revalidatePath("/shop");
  go(`/admin/products/${id}`);
}

export async function updateImage(form: FormData) {
  const admin = await requireAdmin();
  const imageId = uuid.parse(form.get("imageId"));
  const img = await queryOne<{ product_id: string; storage_key: string; sort_order: number }>("select product_id, storage_key, sort_order from product_images where id=$1", [imageId]);
  if (!img) redirect("/admin/products");
  const op = String(form.get("op"));
  if (op === "delete") {
    await query("delete from product_images where id=$1", [imageId]);
    await deleteObject("public", img!.storage_key);
    await audit(admin, "product.image_deleted", "product", img!.product_id);
  } else if (op === "up" || op === "first") {
    const imgs = await query<{ id: string }>("select id from product_images where product_id=$1 order by sort_order, created_at", [img!.product_id]);
    const ids = imgs.map((i) => i.id);
    const at = ids.indexOf(imageId);
    ids.splice(at, 1);
    ids.splice(op === "first" ? 0 : Math.max(0, at - 1), 0, imageId);
    await transaction(async (c) => {
      for (let i = 0; i < ids.length; i++) await c.query("update product_images set sort_order=$1 where id=$2", [i, ids[i]]);
    });
  } else if (op === "alt") {
    await query("update product_images set alt_text=$1 where id=$2", [str(form, "alt", 200), imageId]);
  }
  go(`/admin/products/${img!.product_id}`);
}

export async function deleteProduct(form: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const used = await queryOne(
    `select 1 where exists (select 1 from purchase_request_items where product_id=$1) or exists (select 1 from reservations where product_id=$1)`,
    [id],
  );
  if (used) go(`/admin/products/${id}`, "inuse");
  const imgs = await query<{ storage_key: string }>("select storage_key from product_images where product_id=$1", [id]);
  const p = await queryOne<{ title: string }>("delete from products where id=$1 returning title", [id]);
  await Promise.all(imgs.map((i) => deleteObject("public", i.storage_key)));
  await audit(admin, "product.delete", "product", id, { title: p?.title });
  revalidatePath("/shop");
  go("/admin/products", "deleted");
}

// ───────────────────────────── Purchase requests ─────────────────────────────

// Statuses from the general dropdown. "Payment confirmed", "Ready for collection" and
// "Completed" are only accepted once confirmPayment() has recorded the EFT as received
// (also enforced by a database constraint).
const ADMIN_SETTABLE = Object.keys(PURCHASE_STATUSES) as [PurchaseStatus, ...PurchaseStatus[]];

export async function updatePurchaseRequest(form: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const status = z.enum(ADMIN_SETTABLE).parse(form.get("status"));
  const customerUpdate = str(form, "customerUpdate", 2000);
  const adminNotes = str(form, "adminNotes");
  const agreed = str(form, "agreedTotal", 20);
  const agreedCents = agreed ? parseRandToCents(agreed) : null;
  if (agreed && agreedCents === null) go(`/admin/requests/${id}`, "badamount");

  const r = await queryOne<{ status: PurchaseStatus; user_id: string | null; contact_email: string; reference: string; payment_confirmed_at: Date | null }>(
    "select status, user_id, contact_email, reference, payment_confirmed_at from purchase_requests where id=$1",
    [id],
  );
  if (!r) redirect("/admin/requests");
  if (["payment_confirmed", "ready_for_collection", "completed"].includes(status) && !r!.payment_confirmed_at) go(`/admin/requests/${id}`, "needpayment");

  let released: string[] = [];
  await transaction(async (c) => {
    await c.query(
      `update purchase_requests set status=$2, admin_notes=$3, agreed_total_cents=$4,
         customer_update = case when $5 <> '' then $5 else customer_update end,
         completed_at = case when $2='completed' then coalesce(completed_at, now()) else completed_at end
       where id=$1`,
      [id, status, adminNotes, agreedCents, customerUpdate],
    );
    const items = (await c.query<{ product_id: string }>("select product_id from purchase_request_items where purchase_request_id=$1 and product_id is not null", [id])).rows.map((i) => i.product_id);
    if (["approved", "awaiting_eft", "ready_for_collection"].includes(status)) {
      // Hold the guitars so nobody else can request them.
      await c.query("update products set status='reserved' where id = any($1::uuid[]) and status='published'", [items]);
    } else if (status === "completed") {
      await c.query("update products set status='sold', sold_at=coalesce(sold_at, now()) where id = any($1::uuid[])", [items]);
      // Other customers' open reservations on these guitars can no longer be honoured.
      const open = await c.query<{ id: string }>(
        "update reservations set status='declined', customer_update='Sorry — this guitar has been sold.' where product_id = any($1::uuid[]) and status in ('requested','approved') returning id",
        [items],
      );
      for (const o of open.rows) await addHistory("reservation", o.id, "declined", "Sorry — this guitar has been sold.", admin.id, c);
    } else if (["declined", "cancelled"].includes(status)) {
      released = await releaseIfFree(c, items, id);
    }
    if (status !== r!.status || customerUpdate) {
      await addHistory("purchase_request", id, status, customerUpdate, admin.id, c);
    }
    await audit(admin, "purchase_request.update", "purchase_request", id, { reference: r!.reference, from: r!.status, to: status, agreedCents }, c);
  });
  await sendAvailabilityAlerts(released);
  if (status !== r!.status || customerUpdate) {
    await notifyCustomer({
      userId: r!.user_id,
      email: r!.contact_email,
      kind: "purchase_request",
      title: `Request ${r!.reference}: ${PURCHASE_STATUSES[status]}`,
      body: `Your purchase request ${r!.reference} is now: ${PURCHASE_STATUSES[status]}.${customerUpdate ? `\n\n${customerUpdate}` : ""}\n\nGuitarz4U does not process online payments. Only pay by EFT once Guitarz4U has confirmed the arrangements with you personally.`,
      link: r!.user_id ? `/account/requests/${id}` : `/track?ref=${r!.reference}`,
    });
  }
  revalidatePath("/shop");
  go(`/admin/requests/${id}`);
}

export async function recordEftInstructions(form: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  if (form.get("confirm") !== "on") go(`/admin/requests/${id}`, "needconfirm");
  const method = z.enum(["whatsapp", "email", "phone", "in person"]).parse(form.get("method"));
  const r = await queryOne<{ status: string; user_id: string | null; contact_email: string; reference: string }>(
    "select status, user_id, contact_email, reference from purchase_requests where id=$1", [id],
  );
  if (!r || ["completed", "declined", "cancelled"].includes(r.status)) go(`/admin/requests/${id}`, "notallowed");
  const settings = await getSettings();
  const note = `Payment details were sent to you privately by ${method}. Please make sure they came from Guitarz4U (WhatsApp ${settings.whatsappNumber} or ${settings.email}). Your payment is only confirmed once Guitarz4U has verified that your EFT reflected.`;
  await transaction(async (c) => {
    await c.query(
      `update purchase_requests set eft_instructions_sent_at=now(), eft_instructions_sent_by=$2,
         status = case when status in ('submitted','under_review','awaiting_customer','approved') then 'awaiting_eft' else status end
       where id=$1`,
      [id, admin.id],
    );
    const items = (await c.query<{ product_id: string }>("select product_id from purchase_request_items where purchase_request_id=$1 and product_id is not null", [id])).rows.map((i) => i.product_id);
    await c.query("update products set status='reserved' where id = any($1::uuid[]) and status='published'", [items]);
    await addHistory("purchase_request", id, "awaiting_eft", note, admin.id, c);
    await audit(admin, "purchase_request.eft_instructions_recorded", "purchase_request", id, { reference: r!.reference, method }, c);
  });
  await notifyCustomer({
    userId: r!.user_id, email: r!.contact_email, kind: "purchase_request",
    title: `Request ${r!.reference}: awaiting your EFT`, body: note,
    link: r!.user_id ? `/account/requests/${id}` : `/track?ref=${r!.reference}`,
  });
  go(`/admin/requests/${id}`);
}

/** The ONLY way a payment can be marked as received: an admin, after checking their own bank account. */
export async function confirmPayment(form: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  if (form.get("verified") !== "on") go(`/admin/requests/${id}`, "needconfirm");
  const amount = str(form, "amount", 20);
  const amountCents = amount ? parseRandToCents(amount) : null;
  const r = await queryOne<{ status: string; user_id: string | null; contact_email: string; reference: string; payment_confirmed_at: Date | null }>(
    "select status, user_id, contact_email, reference, payment_confirmed_at from purchase_requests where id=$1", [id],
  );
  if (!r || r.payment_confirmed_at || ["declined", "cancelled", "completed"].includes(r.status)) go(`/admin/requests/${id}`, "notallowed");
  await transaction(async (c) => {
    await c.query(
      `update purchase_requests set status='payment_confirmed', payment_confirmed_at=now(), payment_confirmed_by=$2,
         agreed_total_cents=coalesce($3, agreed_total_cents) where id=$1`,
      [id, admin.id, amountCents],
    );
    await addHistory("purchase_request", id, "payment_confirmed", "Guitarz4U has confirmed that your EFT payment was received. We will contact you privately to confirm collection.", admin.id, c);
    await audit(admin, "purchase_request.payment_confirmed", "purchase_request", id, { reference: r!.reference, amountCents }, c);
  });
  await notifyCustomer({
    userId: r!.user_id, email: r!.contact_email, kind: "purchase_request",
    title: `Payment received for ${r!.reference}`,
    body: `Guitarz4U has confirmed receipt of your EFT payment${amountCents ? ` of ${formatRand(amountCents)}` : ""}. We will contact you privately to confirm the collection arrangements.`,
    link: r!.user_id ? `/account/requests/${id}` : `/track?ref=${r!.reference}`,
  });
  go(`/admin/requests/${id}`, "payment");
}

// ───────────────────────────── Reservations ─────────────────────────────

export async function updateReservation(form: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const op = z.enum(["approve", "decline", "cancel", "expire", "convert", "note"]).parse(form.get("op"));
  const customerUpdate = str(form, "customerUpdate", 2000);
  const adminNotes = str(form, "adminNotes");
  const days = Math.min(30, Math.max(1, parseInt(String(form.get("days") ?? "3"), 10) || 3));
  const r = await queryOne<{ status: string; product_id: string; user_id: string | null; contact_email: string; reference: string; title: string }>(
    "select r.status, r.product_id, r.user_id, r.contact_email, r.reference, p.title from reservations r join products p on p.id=r.product_id where r.id=$1",
    [id],
  );
  if (!r) redirect("/admin/reservations");
  const statusFor = { approve: "approved", decline: "declined", cancel: "cancelled", expire: "expired", convert: "converted", note: r!.status } as const;
  const newStatus = statusFor[op];
  let released: string[] = [];
  try {
    await transaction(async (c) => {
      if (op === "approve") {
        const p = await c.query<{ status: string }>("select status from products where id=$1 for update", [r!.product_id]);
        if (p.rows[0]?.status !== "published") throw new Error("PRODUCT_UNAVAILABLE");
        await c.query("update products set status='reserved' where id=$1", [r!.product_id]);
      }
      await c.query(
        `update reservations set status=$2, admin_notes=$3,
           expires_at = case when $2='approved' and $5 then now() + make_interval(days => $4) else expires_at end,
           customer_update = case when $6 <> '' then $6 else customer_update end
         where id=$1`,
        [id, newStatus, adminNotes, days, op === "approve", customerUpdate],
      );
      if (r!.status === "approved" && ["declined", "cancelled", "expired"].includes(newStatus)) released = await releaseIfFree(c, [r!.product_id]);
      if (op !== "note" || customerUpdate) {
        const note = op === "approve" ? `Your reservation is approved and held for ${days} day${days > 1 ? "s" : ""}. ${customerUpdate}`.trim() : customerUpdate;
        await addHistory("reservation", id, newStatus, note, admin.id, c);
      }
      await audit(admin, `reservation.${op}`, "reservation", id, { reference: r!.reference, product: r!.title, days: op === "approve" ? days : undefined }, c);
    });
  } catch (err) {
    if (err instanceof Error && (err.message === "PRODUCT_UNAVAILABLE" || /reservations_one_approved/.test(err.message))) go("/admin/reservations", "conflict");
    throw err;
  }
  await sendAvailabilityAlerts(released);
  if (op !== "note" || customerUpdate) {
    await notifyCustomer({
      userId: r!.user_id, email: r!.contact_email, kind: "reservation",
      title: `Reservation ${r!.reference}: ${RESERVATION_STATUSES[newStatus as keyof typeof RESERVATION_STATUSES]}`,
      body: `Your reservation request for "${r!.title}" is now: ${RESERVATION_STATUSES[newStatus as keyof typeof RESERVATION_STATUSES]}.${op === "approve" ? ` It is held for ${days} day(s).` : ""}${customerUpdate ? `\n\n${customerUpdate}` : ""}`,
      link: r!.user_id ? "/account/reservations" : `/track?ref=${r!.reference}`,
    });
  }
  revalidatePath("/shop");
  go("/admin/reservations");
}

// ───────────────────────────── Seller submissions ─────────────────────────────

export async function updateSubmission(form: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const status = z.enum(["submitted", "under_review", "more_info_requested", "approved", "offer_made", "offer_accepted", "offer_declined", "purchased", "rejected", "withdrawn"]).parse(form.get("status"));
  const customerUpdate = str(form, "customerUpdate", 2000);
  const adminNotes = str(form, "adminNotes");
  const s = await queryOne<{ status: string; user_id: string | null; email: string; reference: string }>("select status, user_id, email, reference from seller_submissions where id=$1", [id]);
  if (!s) redirect("/admin/submissions");
  await transaction(async (c) => {
    await c.query("update seller_submissions set status=$2, admin_notes=$3, customer_update=case when $4<>'' then $4 else customer_update end where id=$1", [id, status, adminNotes, customerUpdate]);
    if (["rejected", "withdrawn", "purchased"].includes(status)) await c.query("update seller_offers set status='withdrawn' where submission_id=$1 and status='pending'", [id]);
    if (status !== s!.status || customerUpdate) await addHistory("seller_submission", id, status, customerUpdate, admin.id, c);
    await audit(admin, "seller_submission.update", "seller_submission", id, { reference: s!.reference, from: s!.status, to: status }, c);
  });
  if (status !== s!.status || customerUpdate) {
    await notifyCustomer({
      userId: s!.user_id, email: s!.email || null, kind: "seller_submission",
      title: `Your guitar submission ${s!.reference}: ${SELLER_STATUSES[status]}`,
      body: `Update on your guitar submission ${s!.reference}: ${SELLER_STATUSES[status]}.${customerUpdate ? `\n\n${customerUpdate}` : ""}`,
      link: s!.user_id ? "/account/submissions" : `/track?ref=${s!.reference}`,
    });
  }
  go(`/admin/submissions/${id}`);
}

export async function makeOffer(form: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const amountCents = parseRandToCents(str(form, "amount", 20));
  const message = str(form, "message", 2000);
  if (!amountCents || amountCents <= 0) go(`/admin/submissions/${id}`, "badamount");
  const s = await queryOne<{ user_id: string | null; email: string; reference: string; status: string }>("select user_id, email, reference, status from seller_submissions where id=$1", [id]);
  if (!s || ["purchased", "rejected", "withdrawn"].includes(s.status)) go(`/admin/submissions/${id}`, "notallowed");
  await transaction(async (c) => {
    await c.query("update seller_offers set status='withdrawn' where submission_id=$1 and status='pending'", [id]);
    await c.query("insert into seller_offers (submission_id, amount_cents, message, created_by) values ($1,$2,$3,$4)", [id, amountCents, message, admin.id]);
    await c.query("update seller_submissions set status='offer_made' where id=$1", [id]);
    await addHistory("seller_submission", id, "offer_made", `Guitarz4U has offered ${formatRand(amountCents)} for your guitar, subject to inspection.${message ? `\n${message}` : ""}`, admin.id, c);
    await audit(admin, "seller_offer.create", "seller_submission", id, { reference: s!.reference, amountCents }, c);
  });
  await notifyCustomer({
    userId: s!.user_id, email: s!.email || null, kind: "offer",
    title: `Offer for your guitar: ${formatRand(amountCents)}`,
    body: `Guitarz4U would like to offer ${formatRand(amountCents)} for your guitar (reference ${s!.reference}), subject to inspection.${message ? `\n\n${message}` : ""}\n\nYou are free to accept or decline.${s!.user_id ? " You can respond in your account." : " Reply to us on WhatsApp to respond."}`,
    link: s!.user_id ? "/account/submissions" : `/track?ref=${s!.reference}`,
  });
  go(`/admin/submissions/${id}`);
}

export async function withdrawOffer(form: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  await transaction(async (c) => {
    const res = await c.query("update seller_offers set status='withdrawn' where submission_id=$1 and status='pending'", [id]);
    if (res.rowCount) {
      await c.query("update seller_submissions set status='under_review' where id=$1 and status='offer_made'", [id]);
      await addHistory("seller_submission", id, "under_review", "The previous offer has been withdrawn.", admin.id, c);
      await audit(admin, "seller_offer.withdraw", "seller_submission", id, {}, c);
    }
  });
  go(`/admin/submissions/${id}`);
}

// ───────────────────────────── Repairs ─────────────────────────────

export async function updateRepair(form: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const status = z.enum(Object.keys(REPAIR_STATUSES) as [keyof typeof REPAIR_STATUSES]).parse(form.get("status"));
  const customerUpdate = str(form, "customerUpdate", 2000);
  const adminNotes = str(form, "adminNotes");
  const confirmedDate = str(form, "confirmedDate", 10);
  if (confirmedDate && !/^\d{4}-\d{2}-\d{2}$/.test(confirmedDate)) go(`/admin/repairs/${id}`, "error");
  const r = await queryOne<{ status: string; user_id: string | null; email: string; reference: string; quote_provided_at: Date | null; confirmed_date: Date | null }>(
    "select status, user_id, email, reference, quote_provided_at, confirmed_date from repair_bookings where id=$1", [id],
  );
  if (!r) redirect("/admin/repairs");
  if (["approved", "in_progress", "awaiting_collection", "completed"].includes(status) && !r!.quote_provided_at) go(`/admin/repairs/${id}`, "needquote");
  const dateChanged = (confirmedDate || null) !== (r!.confirmed_date ? r!.confirmed_date.toISOString().slice(0, 10) : null);
  await transaction(async (c) => {
    await c.query(
      "update repair_bookings set status=$2, admin_notes=$3, confirmed_date=$4, customer_update=case when $5<>'' then $5 else customer_update end where id=$1",
      [id, status, adminNotes, confirmedDate || null, customerUpdate],
    );
    const note = [dateChanged && confirmedDate ? `Confirmed date: ${confirmedDate}.` : "", customerUpdate].filter(Boolean).join("\n");
    if (status !== r!.status || note) await addHistory("repair_booking", id, status, note, admin.id, c);
    await audit(admin, "repair.update", "repair_booking", id, { reference: r!.reference, from: r!.status, to: status, confirmedDate: confirmedDate || null }, c);
  });
  if (status !== r!.status || customerUpdate || dateChanged) {
    await notifyCustomer({
      userId: r!.user_id, email: r!.email || null, kind: "repair_booking",
      title: `Repair ${r!.reference}: ${REPAIR_STATUSES[status]}`,
      body: `Update on your repair ${r!.reference}: ${REPAIR_STATUSES[status]}.${confirmedDate && dateChanged ? `\nConfirmed date: ${confirmedDate}.` : ""}${customerUpdate ? `\n\n${customerUpdate}` : ""}`,
      link: r!.user_id ? "/account/repairs" : `/track?ref=${r!.reference}`,
    });
  }
  go(`/admin/repairs/${id}`);
}

export async function provideQuote(form: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const amount = str(form, "amount", 20);
  const amountCents = amount ? parseRandToCents(amount) : null;
  const message = str(form, "message", 2000);
  if (amount && amountCents === null) go(`/admin/repairs/${id}`, "badamount");
  if (amountCents === null && !message) go(`/admin/repairs/${id}`, "badamount");
  const r = await queryOne<{ user_id: string | null; email: string; reference: string }>("select user_id, email, reference from repair_bookings where id=$1", [id]);
  if (!r) redirect("/admin/repairs");
  await transaction(async (c) => {
    await c.query(
      "update repair_bookings set status='quote_provided', quote_amount_cents=$2, quote_message=$3, quote_provided_at=now(), quote_response=null, quote_responded_at=null where id=$1",
      [id, amountCents, message],
    );
    await addHistory("repair_booking", id, "quote_provided", `Quote: ${amountCents !== null ? formatRand(amountCents) : "see message"}.${message ? `\n${message}` : ""}\nNo work will start until you approve the quote.`, admin.id, c);
    await audit(admin, "repair.quote", "repair_booking", id, { reference: r!.reference, amountCents }, c);
  });
  await notifyCustomer({
    userId: r!.user_id, email: r!.email || null, kind: "repair_booking",
    title: `Repair quote for ${r!.reference}`,
    body: `Your repair quote is ${amountCents !== null ? formatRand(amountCents) : "in the message below"}.${message ? `\n\n${message}` : ""}\n\nNo work starts until you approve the quote.${r!.user_id ? " You can accept or decline it in your account." : " Reply on WhatsApp to accept or decline."}`,
    link: r!.user_id ? "/account/repairs" : `/track?ref=${r!.reference}`,
  });
  go(`/admin/repairs/${id}`);
}

// ───────────────────────────── Reviews ─────────────────────────────

export async function moderateReview(form: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const op = z.enum(["approved", "rejected", "removed", "pending"]).parse(form.get("op"));
  const note = str(form, "note", 1000);
  const r = await queryOne<{ user_id: string | null }>(
    "update reviews set status=$2, moderation_note=$3, moderated_by=$4, moderated_at=now() where id=$1 returning user_id",
    [id, op, note, admin.id],
  );
  if (op !== "pending") await query("update review_reports set resolved_at=now() where review_id=$1 and resolved_at is null", [id]);
  await audit(admin, `review.${op}`, "review", id, { note });
  if (r?.user_id && (op === "approved" || op === "rejected")) {
    await notifyCustomer({
      userId: r.user_id, kind: "review",
      title: op === "approved" ? "Your review is published" : "Your review was not published",
      body: op === "approved" ? "Thank you — your review is now visible on the Guitarz4U reviews page." : `Your review was not published.${note ? ` Reason: ${note}` : ""}`,
      link: "/reviews",
    });
  }
  revalidatePath("/reviews");
  go("/admin/reviews");
}

// ───────────────────────────── Messages & notifications ─────────────────────────────

export async function updateMessage(form: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const status = z.enum(["new", "read", "replied", "archived"]).parse(form.get("status"));
  await query("update contact_messages set status=$2, admin_notes=$3 where id=$1", [id, status, str(form, "adminNotes")]);
  await audit(admin, "message.update", "contact_message", id, { status });
  go("/admin/messages");
}

export async function markAdminNotificationsRead() {
  await requireAdmin();
  await query("update notifications set read_at=now() where audience='admin' and read_at is null");
  revalidatePath("/admin", "layout");
  go("/admin/notifications");
}

// ───────────────────────────── Content & settings ─────────────────────────────

export async function saveSettings(form: FormData) {
  const admin = await requireAdmin();
  const changed: string[] = [];
  await transaction(async (c) => {
    for (const key of SETTING_KEYS) {
      if (!form.has(key)) continue;
      const def = DEFAULT_SETTINGS[key];
      let value: string | number = str(form, key, 6000);
      if (typeof def === "number") {
        value = Math.min(30, Math.max(1, parseInt(value, 10) || def));
      }
      if (key === "socialUrl" && value && !/^https:\/\/[^\s]+$/.test(String(value))) continue;
      await c.query(
        `insert into site_settings (key, value, updated_by, updated_at) values ($1,$2,$3,now())
         on conflict (key) do update set value=excluded.value, updated_by=excluded.updated_by, updated_at=now()`,
        [key, JSON.stringify(value), admin.id],
      );
      changed.push(key);
    }
    await audit(admin, "settings.update", "site_settings", "", { keys: changed }, c);
  });
  revalidatePath("/", "layout");
  go("/admin/content");
}

// ───────────────────────────── POPIA data requests ─────────────────────────────

export async function processDataRequest(form: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const op = z.enum(["complete", "reject"]).parse(form.get("op"));
  const note = str(form, "note", 1000);
  const dr = await queryOne<{ user_id: string | null; kind: string; status: string }>("select user_id, kind, status from data_requests where id=$1", [id]);
  if (!dr || dr.status !== "pending") go("/admin/data-requests", "notallowed");
  if (op === "complete" && dr!.kind === "deletion" && dr!.user_id) {
    if (form.get("confirm") !== "on") go("/admin/data-requests", "needconfirm");
    await anonymiseUser(admin, dr!.user_id);
  }
  await query("update data_requests set status=$2, admin_note=$3, completed_at=now() where id=$1", [id, op === "complete" ? "completed" : "rejected", note]);
  await audit(admin, `data_request.${op}`, "data_request", id, { kind: dr!.kind, userId: dr!.user_id });
  if (dr!.user_id && !(op === "complete" && dr!.kind === "deletion")) {
    await notifyCustomer({ userId: dr!.user_id, kind: "account", title: `Your ${dr!.kind} request was ${op === "complete" ? "completed" : "declined"}`, body: note || "See your account for details.", link: "/account/privacy" });
  }
  go("/admin/data-requests");
}

/**
 * Account deletion (POPIA): removes login and personal details. Business records
 * (references, items, amounts, statuses) are kept but anonymised.
 */
async function anonymiseUser(admin: CurrentUser, userId: string) {
  const keys = await query<{ storage_key: string }>(
    `select i.storage_key from seller_submission_images i join seller_submissions s on s.id=i.submission_id where s.user_id=$1
     union all select i.storage_key from repair_images i join repair_bookings r on r.id=i.repair_id where r.user_id=$1`,
    [userId],
  );
  await transaction(async (c) => {
    const anon = "Deleted customer";
    await c.query(`update purchase_requests set contact_name=$2, contact_email='', contact_phone='', message='' where user_id=$1`, [userId, anon]);
    await c.query(`update reservations set contact_name=$2, contact_email='', contact_phone='', message='' where user_id=$1`, [userId, anon]);
    await c.query(`update seller_submissions set seller_name=$2, email='', contact_phone='000000', notes='' where user_id=$1`, [userId, anon]);
    await c.query(`update repair_bookings set customer_name=$2, email='', contact_phone='000000', notes='' where user_id=$1`, [userId, anon]);
    await c.query(`delete from seller_submission_images where submission_id in (select id from seller_submissions where user_id=$1)`, [userId]);
    await c.query(`delete from repair_images where repair_id in (select id from repair_bookings where user_id=$1)`, [userId]);
    await c.query(`update reviews set status='removed', display_name='Former customer', user_id=null where user_id=$1`, [userId]);
    await c.query(`update contact_messages set name=$2, email='', phone='', message='[deleted]' where user_id=$1`, [userId, anon]);
    await c.query(`delete from availability_alerts where user_id=$1`, [userId]);
    await c.query(`delete from wishlists where user_id=$1`, [userId]);
    await c.query(`delete from notifications where user_id=$1`, [userId]);
    await c.query(`delete from customer_profiles where user_id=$1`, [userId]);
    await c.query(`delete from session where "userId"=$1`, [userId]);
    await c.query(`delete from account where "userId"=$1`, [userId]);
    await c.query(
      `update "user" set name=$2, email=$3, image=null, "emailVerified"=false, "deletedAt"=now(), "updatedAt"=now() where id=$1 and role<>'admin'`,
      [userId, anon, `deleted-${userId}@deleted.invalid`],
    );
    await audit(admin, "user.anonymised", "user", userId, { images: keys.length }, c);
  });
  await Promise.all(keys.map((k) => deleteObject("private", k.storage_key)));
}

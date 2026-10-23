"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fail, formToObject, success, zodFieldErrors, type ActionState } from "@/lib/actions";
import { friendlyError } from "@/lib/errors";
import { productSchema } from "@/lib/validation";
import { slugify } from "@/lib/format";
import { sendEmail } from "@/lib/email";
import { DEFAULT_PAGES } from "@/content/pages";
import {
  PURCHASE_STATUS_LABELS,
  REPAIR_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
  SELLER_STATUS_LABELS,
} from "@/lib/constants";

const uuid = z.uuid();

async function admin() {
  await requireAdmin();
  return createClient();
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
async function resolveBrandId(supabase: Awaited<ReturnType<typeof createClient>>, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const { data: existing } = await supabase.from("brands").select("id").ilike("name", trimmed).maybeSingle();
  if (existing) return existing.id as number;
  const { data, error } = await supabase
    .from("brands")
    .insert({ name: trimmed, slug: slugify(trimmed) || `brand-${Date.now()}` })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as number;
}

export async function saveProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await admin();
  const id = String(formData.get("id") ?? "");
  const parsed = productSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  const v = parsed.data;

  let brandId: number | null;
  try {
    brandId = await resolveBrandId(supabase, v.brand_name);
  } catch (e) {
    return fail(friendlyError(e as { message?: string }));
  }

  const row = {
    title: v.title,
    brand_id: brandId,
    model: v.model || null,
    category_id: v.category_id,
    price: v.price,
    compare_at_price: v.compare_at_price && v.compare_at_price > v.price ? v.compare_at_price : null,
    condition: v.condition,
    functional_status: v.functional_status,
    status: v.status,
    description: v.description,
    defects: v.defects,
    history: v.history,
    specifications: v.specifications,
    included_items: v.included_items,
    year_made: v.year_made || null,
    colour: v.colour || null,
    is_featured: v.status === "sold" ? false : v.is_featured,
  };

  let productId = id;
  if (id) {
    if (!uuid.safeParse(id).success) return fail("Invalid product.");
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) return fail(friendlyError(error));
  } else {
    const slug = `${slugify(v.title) || "guitar"}-${Math.random().toString(36).slice(2, 7)}`;
    const { data, error } = await supabase.from("products").insert({ ...row, slug }).select("id").single();
    if (error) return fail(friendlyError(error));
    productId = data.id;
  }

  const { error: privError } = await supabase.from("product_private").upsert({
    product_id: productId,
    serial_number: v.serial_number || null,
    acquisition_notes: v.acquisition_notes || null,
    internal_notes: v.internal_notes || null,
  });
  if (privError) return fail(friendlyError(privError));

  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/products/${productId}?created=1`);
  return success("Product saved.");
}

export async function setProductStatusAction(formData: FormData) {
  const supabase = await admin();
  const id = uuid.parse(formData.get("id"));
  const status = z.enum(["draft", "published", "reserved", "sold", "archived"]).parse(formData.get("status"));
  await supabase.from("products").update({ status }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function deleteProductAction(formData: FormData) {
  const supabase = await admin();
  const id = uuid.parse(formData.get("id"));
  const { data: product } = await supabase.from("products").select("status, is_demo, images:product_images(storage_path)").eq("id", id).single();
  // Only drafts and demo listings can be deleted; real stock is archived to preserve history.
  if (!product || !(product.status === "draft" || product.is_demo)) return;
  const paths = ((product.images ?? []) as { storage_path: string }[]).map((i) => i.storage_path).filter((p) => !p.startsWith("/") && !p.startsWith("http"));
  if (paths.length) await supabase.storage.from("product-images").remove(paths);
  await supabase.from("purchase_request_items").update({ product_id: null }).eq("product_id", id);
  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function addProductImageAction(productId: string, path: string, alt: string) {
  const supabase = await admin();
  if (!uuid.safeParse(productId).success || !path.startsWith(`${productId}/`)) return { ok: false, message: "Invalid image." };
  const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
  if ((count ?? 0) >= 12) return { ok: false, message: "A product can have up to 12 photographs." };
  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: path,
    alt_text: alt.slice(0, 200) || null,
    sort_order: count ?? 0,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true };
}

export async function updateImageAction(formData: FormData) {
  const supabase = await admin();
  const id = uuid.parse(formData.get("image_id"));
  const productId = uuid.parse(formData.get("product_id"));
  const op = String(formData.get("op"));
  const { data: images } = await supabase.from("product_images").select("id, storage_path, sort_order").eq("product_id", productId).order("sort_order");
  const list = (images ?? []) as { id: string; storage_path: string; sort_order: number }[];
  const index = list.findIndex((i) => i.id === id);
  if (index < 0) return;

  if (op === "delete") {
    const img = list[index];
    if (!img.storage_path.startsWith("/") && !img.storage_path.startsWith("http")) {
      await supabase.storage.from("product-images").remove([img.storage_path]);
    }
    await supabase.from("product_images").delete().eq("id", id);
  } else if (op === "up" || op === "down" || op === "first") {
    const target = op === "first" ? 0 : op === "up" ? Math.max(0, index - 1) : Math.min(list.length - 1, index + 1);
    const [moved] = list.splice(index, 1);
    list.splice(target, 0, moved);
    await Promise.all(list.map((img, i) => supabase.from("product_images").update({ sort_order: i }).eq("id", img.id)));
  } else if (op === "alt") {
    const alt = String(formData.get("alt_text") ?? "").slice(0, 200);
    await supabase.from("product_images").update({ alt_text: alt || null }).eq("id", id);
  }
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Purchase requests (private EFT workflow)
// ---------------------------------------------------------------------------
const purchaseStatusSchema = z.enum([
  "under_review", "awaiting_customer", "approved", "awaiting_eft", "payment_confirmed",
  "ready_for_collection", "completed", "declined", "cancelled",
]);

export async function setPurchaseStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await admin();
  const id = uuid.safeParse(formData.get("id"));
  const status = purchaseStatusSchema.safeParse(formData.get("status"));
  if (!id.success || !status.success) return fail("Please choose a status.");
  if (status.data === "payment_confirmed" && formData.get("confirm_bank_checked") !== "on") {
    return fail("Please confirm that you have personally checked your bank account and the EFT has cleared.", {
      confirm_bank_checked: "Required before confirming payment.",
    });
  }
  const message = String(formData.get("customer_message") ?? "").trim().slice(0, 2000);
  const note = String(formData.get("admin_note") ?? "").trim().slice(0, 4000);
  const { error } = await supabase.rpc("admin_set_purchase_status", {
    p_request_id: id.data,
    p_status: status.data,
    p_customer_message: message,
    p_admin_note: note,
  });
  if (error) return fail(friendlyError(error));

  if (formData.get("email_customer") === "on") {
    const { data: req } = await supabase.from("purchase_requests").select("reference, contact_email").eq("id", id.data).single();
    const result = await sendEmail(
      req?.contact_email,
      `Update on purchase request ${req?.reference}`,
      `Status: ${PURCHASE_STATUS_LABELS[status.data]}${message ? `\n\n${message}` : ""}`,
      `/account/requests/${id.data}`,
    );
    revalidatePath(`/admin/requests/${id.data}`);
    revalidatePath("/", "layout");
    return success(`Status updated. ${result.sent ? "Email sent to the customer." : "Email was NOT sent (email is not configured or failed) — the customer can see the update in their account."}`);
  }
  revalidatePath(`/admin/requests/${id.data}`);
  revalidatePath("/", "layout");
  return success("Status updated. The customer can see this update in their account.");
}

export async function addAdminNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await admin();
  const entityType = z.enum(["purchase_request", "reservation", "seller_submission", "repair_booking", "enquiry", "customer", "product"]).safeParse(formData.get("entity_type"));
  const id = uuid.safeParse(formData.get("entity_id"));
  const note = String(formData.get("note") ?? "").trim();
  if (!entityType.success || !id.success || !note) return fail("Please write a note.");
  const { error } = await supabase.rpc("admin_add_note", { p_entity_type: entityType.data, p_entity_id: id.data, p_note: note.slice(0, 4000) });
  if (error) return fail(friendlyError(error));
  revalidatePath(String(formData.get("path") ?? "/admin"));
  return success("Private note saved.");
}

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------
export async function setReservationStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await admin();
  const id = uuid.safeParse(formData.get("id"));
  const status = z.enum(["approved", "declined", "cancelled", "expired", "fulfilled"]).safeParse(formData.get("status"));
  if (!id.success || !status.success) return fail("Please choose an action.");
  const holdDays = Number(formData.get("hold_days") ?? 3);
  const message = String(formData.get("customer_message") ?? "").trim().slice(0, 2000);
  const { error } = await supabase.rpc("admin_set_reservation_status", {
    p_reservation_id: id.data,
    p_status: status.data,
    p_customer_message: message,
    p_hold_days: Number.isFinite(holdDays) ? holdDays : 3,
  });
  if (error) return fail(friendlyError(error));
  const { data: res } = await supabase.from("reservations").select("reference, contact_email").eq("id", id.data).single();
  if (formData.get("email_customer") === "on") {
    await sendEmail(res?.contact_email, `Update on reservation ${res?.reference}`, `Status: ${RESERVATION_STATUS_LABELS[status.data]}${message ? `\n\n${message}` : ""}`, "/account/reservations");
  }
  revalidatePath("/admin/reservations");
  revalidatePath("/", "layout");
  return success(`Reservation ${RESERVATION_STATUS_LABELS[status.data].toLowerCase()}.`);
}

// ---------------------------------------------------------------------------
// Seller submissions & offers
// ---------------------------------------------------------------------------
export async function setSellerStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await admin();
  const id = uuid.safeParse(formData.get("id"));
  const status = z.enum(["under_review", "more_info_requested", "approved", "rejected", "completed", "withdrawn"]).safeParse(formData.get("status"));
  if (!id.success || !status.success) return fail("Please choose a status.");
  const message = String(formData.get("customer_message") ?? "").trim().slice(0, 2000);
  const { error } = await supabase.rpc("admin_set_seller_status", { p_submission_id: id.data, p_status: status.data, p_customer_message: message });
  if (error) return fail(friendlyError(error));
  if (formData.get("email_customer") === "on") {
    const { data: s } = await supabase.from("seller_submissions").select("reference, email").eq("id", id.data).single();
    await sendEmail(s?.email, `Update on seller submission ${s?.reference}`, `Status: ${SELLER_STATUS_LABELS[status.data]}${message ? `\n\n${message}` : ""}`, `/account/selling/${id.data}`);
  }
  revalidatePath(`/admin/submissions/${id.data}`);
  return success("Status updated.");
}

export async function makeOfferAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await admin();
  const id = uuid.safeParse(formData.get("id"));
  const amount = Number(String(formData.get("amount") ?? "").replace(/[\sR,]/gi, ""));
  if (!id.success) return fail("Invalid submission.");
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return fail("Please enter a valid offer amount.", { amount: "Enter an amount in rand." });
  const message = String(formData.get("message") ?? "").trim().slice(0, 2000);
  const { error } = await supabase.rpc("admin_make_offer", { p_submission_id: id.data, p_amount: amount, p_message: message });
  if (error) return fail(friendlyError(error));
  if (formData.get("email_customer") === "on") {
    const { data: s } = await supabase.from("seller_submissions").select("reference, email").eq("id", id.data).single();
    await sendEmail(s?.email, `You have an offer for submission ${s?.reference}`, `Guitarz4U has made you an offer. Please sign in to accept or decline it.${message ? `\n\n${message}` : ""}`, `/account/selling/${id.data}`);
  }
  revalidatePath(`/admin/submissions/${id.data}`);
  return success("Offer sent. The seller can accept or decline it in their account.");
}

// ---------------------------------------------------------------------------
// Repairs
// ---------------------------------------------------------------------------
export async function setRepairStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await admin();
  const id = uuid.safeParse(formData.get("id"));
  const status = z.enum(["awaiting_review", "awaiting_info", "approved", "in_progress", "awaiting_collection", "completed", "cancelled"]).safeParse(formData.get("status"));
  if (!id.success || !status.success) return fail("Please choose a status.");
  const message = String(formData.get("customer_message") ?? "").trim().slice(0, 2000);
  const { error } = await supabase.rpc("admin_set_repair_status", { p_booking_id: id.data, p_status: status.data, p_customer_message: message });
  if (error) return fail(friendlyError(error));
  if (formData.get("email_customer") === "on") {
    const { data: b } = await supabase.from("repair_bookings").select("reference, contact_email").eq("id", id.data).single();
    await sendEmail(b?.contact_email, `Update on repair ${b?.reference}`, `Status: ${REPAIR_STATUS_LABELS[status.data]}${message ? `\n\n${message}` : ""}`, `/account/repairs/${id.data}`);
  }
  revalidatePath(`/admin/repairs/${id.data}`);
  return success("Status updated.");
}

export async function provideQuoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await admin();
  const id = uuid.safeParse(formData.get("id"));
  const amount = Number(String(formData.get("amount") ?? "").replace(/[\sR,]/gi, ""));
  if (!id.success) return fail("Invalid booking.");
  if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000) return fail("Please enter a valid quote amount.", { amount: "Enter an amount in rand." });
  const message = String(formData.get("message") ?? "").trim().slice(0, 2000);
  const { error } = await supabase.rpc("admin_provide_repair_quote", { p_booking_id: id.data, p_amount: amount, p_message: message });
  if (error) return fail(friendlyError(error));
  if (formData.get("email_customer") === "on") {
    const { data: b } = await supabase.from("repair_bookings").select("reference, contact_email").eq("id", id.data).single();
    await sendEmail(b?.contact_email, `Repair quote for ${b?.reference}`, `Guitarz4U has sent you a repair quote. Please sign in to accept or decline it.${message ? `\n\n${message}` : ""}`, `/account/repairs/${id.data}`);
  }
  revalidatePath(`/admin/repairs/${id.data}`);
  return success("Quote sent. The customer can accept or decline it in their account.");
}

// ---------------------------------------------------------------------------
// Reviews, enquiries
// ---------------------------------------------------------------------------
export async function moderateReviewAction(formData: FormData) {
  const supabase = await admin();
  const id = uuid.parse(formData.get("id"));
  const status = z.enum(["approved", "rejected", "removed", "pending"]).parse(formData.get("status"));
  await supabase.rpc("admin_moderate_review", { p_review_id: id, p_status: status });
  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  revalidatePath("/");
}

export async function resolveReportAction(formData: FormData) {
  const supabase = await admin();
  const id = uuid.parse(formData.get("id"));
  await supabase.from("review_reports").update({ resolved: true }).eq("id", id);
  revalidatePath("/admin/reviews");
}

export async function setEnquiryStatusAction(formData: FormData) {
  const supabase = await admin();
  const id = uuid.parse(formData.get("id"));
  const status = z.enum(["new", "in_progress", "closed"]).parse(formData.get("status"));
  await supabase.from("enquiries").update({ status }).eq("id", id);
  revalidatePath("/admin/enquiries");
}

// ---------------------------------------------------------------------------
// Customers & POPIA requests
// ---------------------------------------------------------------------------
export async function processDeletionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await admin();
  const userId = uuid.safeParse(formData.get("user_id"));
  if (!userId.success) return fail("Invalid customer.");
  if (formData.get("confirm") !== "on") return fail("Please tick the confirmation box.");
  const { error } = await supabase.rpc("admin_anonymise_user", { p_user_id: userId.data });
  if (error) return fail(friendlyError(error));
  const service = createServiceClient();
  let authDeleted = false;
  if (service) {
    const { error: delError } = await service.auth.admin.deleteUser(userId.data);
    authDeleted = !delError;
  }
  revalidatePath("/admin/customers");
  return success(
    authDeleted
      ? "Personal data anonymised and the login account deleted."
      : "Personal data anonymised. The login account could NOT be deleted automatically (SUPABASE_SECRET_KEY is not set) — delete it in Supabase → Authentication → Users.",
  );
}

export async function rejectDataRequestAction(formData: FormData) {
  const supabase = await admin();
  const id = uuid.parse(formData.get("id"));
  await supabase.from("data_requests").update({ status: "rejected", completed_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/customers");
}

// ---------------------------------------------------------------------------
// Site content & settings
// ---------------------------------------------------------------------------
async function saveSetting(key: string, value: unknown, isPublic = true) {
  const supabase = await admin();
  const { data: auth } = await supabase.auth.getUser();
  return supabase.from("site_settings").upsert({ key, value, is_public: isPublic, updated_by: auth.user?.id ?? null });
}

export async function savePageContentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = String(formData.get("slug") ?? "");
  if (!DEFAULT_PAGES[slug]) return fail("Unknown page.");
  const body = String(formData.get("body") ?? "").slice(0, 30000);
  const { error } = formData.get("reset") === "1" ? await (await admin()).from("site_settings").delete().eq("key", `page:${slug}`) : await saveSetting(`page:${slug}`, { body });
  if (error) return fail(friendlyError(error));
  revalidatePath("/", "layout");
  return success(formData.get("reset") === "1" ? "Page reset to the default text." : "Page saved.");
}

const contactSettingsSchema = z.object({
  whatsapp_display: z.string().trim().min(6).max(30),
  email: z.email().max(200),
  social_handle: z.string().trim().max(60),
  location_label: z.string().trim().max(120),
  hours_notice: z.string().trim().max(120),
  social_links: z.string().max(2000).optional().default(""),
});

export async function saveContactSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = contactSettingsSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  const digits = v.whatsapp_display.replace(/\D/g, "");
  const whatsapp_number = digits.startsWith("27") ? digits : digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
  const social_links = v.social_links
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split("|").map((s) => s.trim());
      return { label, url };
    })
    .filter((l) => l.label && /^https:\/\//.test(l.url ?? ""))
    .slice(0, 6);
  const { error } = await saveSetting("contact", { ...v, whatsapp_number, social_links });
  if (error) return fail(friendlyError(error));
  revalidatePath("/", "layout");
  return success("Contact details saved.");
}

export async function saveAnnouncementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const text = String(formData.get("text") ?? "").trim().slice(0, 200);
  const { error } = await saveSetting("announcement", { enabled: formData.get("enabled") === "on" && text.length > 0, text });
  if (error) return fail(friendlyError(error));
  revalidatePath("/", "layout");
  return success("Announcement saved.");
}

export async function saveRepairPricesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const items = ["strings", "setup", "electronics", "body", "hardware", "fretwork", "other"]
    .map((service) => ({ service, price: String(formData.get(`price_${service}`) ?? "").trim().slice(0, 60) }))
    .filter((i) => i.price);
  const { error } = await saveSetting("repair_prices", { show: formData.get("show") === "on", items });
  if (error) return fail(friendlyError(error));
  revalidatePath("/repairs");
  return success("Repair prices saved.");
}

export async function saveReservationSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const days = Number(formData.get("hold_days"));
  if (!Number.isInteger(days) || days < 1 || days > 30) return fail("Hold period must be between 1 and 30 days.");
  const { error } = await saveSetting("reservations", { hold_days: days });
  if (error) return fail(friendlyError(error));
  revalidatePath("/", "layout");
  return success("Reservation settings saved.");
}

export async function removeDemoDataAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (formData.get("confirm") !== "on") return fail("Please tick the confirmation box.");
  const supabase = await admin();
  const { data, error } = await supabase.rpc("admin_remove_demo_data");
  if (error) return fail(friendlyError(error));
  revalidatePath("/", "layout");
  return success(`Removed ${data ?? 0} demonstration listing(s). Your shop now contains only real products.`);
}

export async function renameBrandAction(formData: FormData) {
  const supabase = await admin();
  const id = z.coerce.number().int().positive().parse(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) return;
  await supabase.from("brands").update({ name, slug: slugify(name) }).eq("id", id);
  revalidatePath("/admin/settings");
  revalidatePath("/shop");
}

export async function deleteBrandAction(formData: FormData) {
  const supabase = await admin();
  const id = z.coerce.number().int().positive().parse(formData.get("id"));
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("brand_id", id);
  if ((count ?? 0) > 0) return; // still in use
  await supabase.from("brands").delete().eq("id", id);
  revalidatePath("/admin/settings");
}

export async function markAdminNotificationsReadAction() {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/admin", "layout");
}

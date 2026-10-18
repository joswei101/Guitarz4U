"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { safeFlush } from "@/lib/email";
import { slugify } from "@/lib/format";
import {
  PURCHASE_REQUEST_STATUSES,
  REPAIR_STATUSES,
  RESERVATION_STATUSES,
  SELLER_STATUSES,
} from "@/lib/constants";
import { type ActionResult, fieldErrors, formDataToObject, friendlyDbError, productSchema } from "@/lib/validation";

type Res<T = undefined> = Promise<ActionResult<T>>;

async function guard() {
  const a = await assertAdmin();
  if (!a.ok) throw new Error(a.error);
  return { userId: a.userId, supabase: await createClient() };
}

function fail(e: unknown): ActionResult<never> {
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export async function saveProduct(_prev: ActionResult | null, formData: FormData): Res {
  let newId: string | null = null;
  try {
    const { supabase } = await guard();
    const id = String(formData.get("id") || "");
    const parsed = productSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    const { serial_number, acquisition_cost, acquired_from, internal_notes, ...product } = parsed.data;

    let productId = id;
    if (id) {
      const { error } = await supabase.from("products").update(product).eq("id", id);
      if (error) return { ok: false, error: friendlyDbError(error) };
    } else {
      const slug = `${slugify(product.title) || "item"}-${Math.random().toString(36).slice(2, 7)}`;
      const { data, error } = await supabase.from("products").insert({ ...product, slug }).select("id").single();
      if (error || !data) return { ok: false, error: friendlyDbError(error) };
      productId = data.id;
      newId = data.id;
    }
    const { error: privErr } = await supabase
      .from("product_private")
      .upsert({ product_id: productId, serial_number, acquisition_cost, acquired_from, internal_notes });
    if (privErr) return { ok: false, error: friendlyDbError(privErr) };
    after(safeFlush);
    revalidatePath("/admin/products");
    revalidatePath("/shop", "layout");
    revalidatePath("/");
  } catch (e) {
    return fail(e);
  }
  if (newId) redirect(`/admin/products/${newId}?created=1`);
  return { ok: true, message: "Product saved." };
}

export async function setProductStatus(id: string, status: string): Res {
  try {
    const { supabase } = await guard();
    if (!["draft", "published", "reserved", "sold", "archived"].includes(status)) return { ok: false, error: "Invalid status." };
    const { error } = await supabase.from("products").update({ status }).eq("id", id);
    if (error) return { ok: false, error: friendlyDbError(error) };
    after(safeFlush);
    revalidatePath("/admin/products");
    revalidatePath("/shop", "layout");
    return { ok: true, message: "Status updated." };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleFeatured(id: string, featured: boolean): Res {
  try {
    const { supabase } = await guard();
    const { error } = await supabase.from("products").update({ featured }).eq("id", id);
    if (error) return { ok: false, error: friendlyDbError(error) };
    revalidatePath("/admin/products");
    revalidatePath("/");
    return { ok: true, message: featured ? "Featured." : "No longer featured." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProduct(id: string): Res {
  try {
    const { supabase } = await guard();
    const { data: imgs } = await supabase.from("product_images").select("storage_path, thumb_path").eq("product_id", id);
    const { count } = await supabase.from("purchase_request_items").select("id", { count: "exact", head: true }).eq("product_id", id);
    if (count) return { ok: false, error: "This product appears in purchase requests. Archive it instead to keep the history." };
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return { ok: false, error: friendlyDbError(error) };
    const paths = (imgs ?? []).flatMap((i) => [i.storage_path, i.thumb_path]).filter((p): p is string => Boolean(p) && !p!.startsWith("/"));
    if (paths.length) await supabase.storage.from("product-images").remove(paths);
    revalidatePath("/admin/products");
    revalidatePath("/shop", "layout");
  } catch (e) {
    return fail(e);
  }
  redirect("/admin/products?deleted=1");
}

export async function reorderImages(productId: string, orderedIds: string[]): Res {
  try {
    const { supabase } = await guard();
    for (const [i, id] of orderedIds.entries()) {
      const { error } = await supabase.from("product_images").update({ sort_order: i }).eq("id", id).eq("product_id", productId);
      if (error) return { ok: false, error: friendlyDbError(error) };
    }
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/shop", "layout");
    return { ok: true, message: "Order saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function updateImageAlt(imageId: string, alt: string): Res {
  try {
    const { supabase } = await guard();
    const { error } = await supabase.from("product_images").update({ alt_text: alt.slice(0, 300) }).eq("id", imageId);
    if (error) return { ok: false, error: friendlyDbError(error) };
    return { ok: true, message: "Saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteImage(imageId: string): Res {
  try {
    const { supabase } = await guard();
    const { data: img } = await supabase.from("product_images").select("storage_path, thumb_path, product_id").eq("id", imageId).single();
    const { error } = await supabase.from("product_images").delete().eq("id", imageId);
    if (error) return { ok: false, error: friendlyDbError(error) };
    const paths = [img?.storage_path, img?.thumb_path].filter((p): p is string => Boolean(p) && !p!.startsWith("/"));
    if (paths.length) await supabase.storage.from("product-images").remove(paths);
    if (img) revalidatePath(`/admin/products/${img.product_id}`);
    return { ok: true, message: "Photo deleted." };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Categories & brands
// ---------------------------------------------------------------------------
export async function saveCategory(_prev: ActionResult | null, formData: FormData): Res {
  try {
    const { supabase } = await guard();
    const parsed = z
      .object({
        id: z.coerce.number().optional(),
        name: z.string().trim().min(2).max(60),
        description: z.string().trim().max(500).optional(),
        kind: z.enum(["guitar", "equipment"]),
        sort_order: z.coerce.number().int().default(0),
        active: z.literal("on").optional(),
      })
      .safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
    const { id, active, ...v } = parsed.data;
    const row = { ...v, active: active === "on", description: v.description || null };
    const { error } = id
      ? await supabase.from("categories").update(row).eq("id", id)
      : await supabase.from("categories").insert({ ...row, slug: slugify(v.name) });
    if (error) return { ok: false, error: friendlyDbError(error) };
    revalidatePath("/admin/catalogue");
    revalidatePath("/shop", "layout");
    return { ok: true, message: "Category saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function saveBrand(_prev: ActionResult | null, formData: FormData): Res {
  try {
    const { supabase } = await guard();
    const name = String(formData.get("name") ?? "").trim();
    const id = Number(formData.get("id") || 0);
    if (name.length < 1 || name.length > 60) return { ok: false, error: "Enter a brand name (max 60 characters)." };
    const { error } = id
      ? await supabase.from("brands").update({ name, slug: slugify(name) }).eq("id", id)
      : await supabase.from("brands").insert({ name, slug: slugify(name) });
    if (error) return { ok: false, error: friendlyDbError(error) };
    revalidatePath("/admin/catalogue");
    return { ok: true, message: "Brand saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCatalogueItem(table: "categories" | "brands", id: number): Res {
  try {
    const { supabase } = await guard();
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error)
      return {
        ok: false,
        error: error.code === "23503" ? "It is still used by products — move them first (or deactivate the category)." : friendlyDbError(error),
      };
    revalidatePath("/admin/catalogue");
    return { ok: true, message: "Deleted." };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Workflow records (purchase requests, reservations, submissions, repairs)
// ---------------------------------------------------------------------------
const WORKFLOW = {
  purchase_requests: { statuses: PURCHASE_REQUEST_STATUSES, path: "/admin/requests" },
  reservations: { statuses: RESERVATION_STATUSES, path: "/admin/reservations" },
  seller_submissions: { statuses: SELLER_STATUSES, path: "/admin/submissions" },
  repair_bookings: { statuses: REPAIR_STATUSES, path: "/admin/repairs" },
} as const;
type WorkflowTable = keyof typeof WORKFLOW;

export async function updateWorkflow(table: WorkflowTable, id: string, _prev: ActionResult | null, formData: FormData): Res {
  try {
    const { supabase } = await guard();
    const cfg = WORKFLOW[table];
    if (!cfg) return { ok: false, error: "Unknown record type." };
    const status = String(formData.get("status") ?? "");
    if (!cfg.statuses.some((s) => s.value === status)) return { ok: false, error: "Choose a valid status." };
    const message = String(formData.get("customer_message") ?? "").trim().slice(0, 2000);
    const update: Record<string, unknown> = { status, customer_message: message || null };

    if (table === "reservations" && status === "approved")
      return { ok: false, error: "Use the Approve button so the item is reserved correctly." };

    if (table === "repair_bookings") {
      const quote = String(formData.get("quote_amount") ?? "").trim();
      const appt = String(formData.get("appointment_at") ?? "").trim();
      if (quote !== "") {
        const n = Number(quote);
        if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Enter a valid quote amount.", fieldErrors: { quote_amount: "Invalid amount" } };
        update.quote_amount = n;
      } else update.quote_amount = null;
      update.quote_message = String(formData.get("quote_message") ?? "").trim().slice(0, 2000) || null;
      update.appointment_at = appt ? new Date(`${appt}:00+02:00`).toISOString() : null;
    }

    const { error } = await supabase.from(table).update(update as never).eq("id", id);
    if (error) return { ok: false, error: friendlyDbError(error) };
    after(safeFlush);
    revalidatePath(`${cfg.path}/${id}`);
    revalidatePath(cfg.path);
    return { ok: true, message: "Saved. The customer can see the update in their account." };
  } catch (e) {
    return fail(e);
  }
}

export async function approveReservation(id: string, _prev: ActionResult | null, formData: FormData): Res {
  try {
    const { supabase } = await guard();
    const days = Number(formData.get("hold_days") || 3);
    const { error } = await supabase.rpc("approve_reservation", {
      p_id: id,
      p_hold_days: days,
      p_message: String(formData.get("customer_message") ?? ""),
    });
    if (error) return { ok: false, error: friendlyDbError(error) };
    after(safeFlush);
    revalidatePath(`/admin/reservations/${id}`);
    revalidatePath("/shop", "layout");
    return { ok: true, message: "Reservation approved and the item is now marked as reserved." };
  } catch (e) {
    return fail(e);
  }
}

export async function declineReservation(id: string, message: string): Res {
  try {
    const { supabase } = await guard();
    const { error } = await supabase.rpc("decline_reservation", { p_id: id, p_message: message });
    if (error) return { ok: false, error: friendlyDbError(error) };
    after(safeFlush);
    revalidatePath(`/admin/reservations/${id}`);
    revalidatePath("/shop", "layout");
    return { ok: true, message: "Reservation declined/released." };
  } catch (e) {
    return fail(e);
  }
}

export async function markRequestItemsSold(requestId: string): Res {
  try {
    const { supabase } = await guard();
    const { data: items } = await supabase.from("purchase_request_items").select("product_id").eq("request_id", requestId);
    const ids = (items ?? []).map((i) => i.product_id).filter((x): x is string => Boolean(x));
    if (!ids.length) return { ok: false, error: "No linked products." };
    const { error } = await supabase.from("products").update({ status: "sold" }).in("id", ids);
    if (error) return { ok: false, error: friendlyDbError(error) };
    revalidatePath("/shop", "layout");
    return { ok: true, message: `${ids.length} item(s) marked as sold.` };
  } catch (e) {
    return fail(e);
  }
}

export async function makeOffer(submissionId: string, _prev: ActionResult | null, formData: FormData): Res {
  try {
    const { supabase } = await guard();
    const parsed = z
      .object({
        amount: z.coerce.number().positive("Enter an amount greater than zero").max(10_000_000),
        message: z.string().trim().max(2000).default(""),
        valid_until: z.string().optional(),
      })
      .safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, error: "Please check the offer.", fieldErrors: fieldErrors(parsed.error) };
    const { amount, message, valid_until } = parsed.data;
    const { error } = await supabase.from("seller_offers").insert({
      submission_id: submissionId,
      amount,
      message,
      valid_until: valid_until ? new Date(`${valid_until}T23:59:00+02:00`).toISOString() : null,
    });
    if (error) return { ok: false, error: friendlyDbError(error) };
    after(safeFlush);
    revalidatePath(`/admin/submissions/${submissionId}`);
    return { ok: true, message: "Offer sent. The seller can accept or decline it in their account." };
  } catch (e) {
    return fail(e);
  }
}

export async function withdrawOffer(offerId: string, submissionId: string): Res {
  try {
    const { supabase } = await guard();
    const { error } = await supabase.from("seller_offers").update({ status: "withdrawn" }).eq("id", offerId).eq("status", "pending");
    if (error) return { ok: false, error: friendlyDbError(error) };
    revalidatePath(`/admin/submissions/${submissionId}`);
    return { ok: true, message: "Offer withdrawn." };
  } catch (e) {
    return fail(e);
  }
}

export async function addAdminNote(entityType: string, entityId: string, note: string): Res {
  try {
    const { supabase, userId } = await guard();
    const n = note.trim();
    if (!n) return { ok: false, error: "Write a note first." };
    const { error } = await supabase.from("admin_notes").insert({ entity_type: entityType, entity_id: entityId, note: n.slice(0, 4000), author_id: userId });
    if (error) return { ok: false, error: friendlyDbError(error) };
    return { ok: true, message: "Note added." };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Reviews, messages, notifications, privacy requests
// ---------------------------------------------------------------------------
export async function moderateReview(id: string, status: "approved" | "rejected" | "removed", reason?: string): Res {
  try {
    const { supabase, userId } = await guard();
    const { error } = await supabase
      .from("reviews")
      .update({ status, rejection_reason: reason?.trim() || null, moderated_by: userId, moderated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { ok: false, error: friendlyDbError(error) };
    if (status !== "approved") await supabase.from("review_reports").update({ resolved: true }).eq("review_id", id);
    revalidatePath("/admin/reviews");
    revalidatePath("/reviews");
    return { ok: true, message: `Review ${status}.` };
  } catch (e) {
    return fail(e);
  }
}

export async function resolveReports(reviewId: string): Res {
  try {
    const { supabase } = await guard();
    const { error } = await supabase.from("review_reports").update({ resolved: true }).eq("review_id", reviewId);
    if (error) return { ok: false, error: friendlyDbError(error) };
    revalidatePath("/admin/reviews");
    return { ok: true, message: "Reports dismissed." };
  } catch (e) {
    return fail(e);
  }
}

export async function setMessageStatus(id: string, status: "new" | "replied" | "closed"): Res {
  try {
    const { supabase } = await guard();
    const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
    if (error) return { ok: false, error: friendlyDbError(error) };
    revalidatePath("/admin/messages");
    return { ok: true, message: "Updated." };
  } catch (e) {
    return fail(e);
  }
}

export async function markAdminNotificationsRead(ids?: string[]): Res {
  try {
    const { supabase } = await guard();
    const { error } = await supabase.rpc("mark_notifications_read", { p_ids: ids });
    if (error) return { ok: false, error: friendlyDbError(error) };
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Marked as read." };
  } catch (e) {
    return fail(e);
  }
}

export async function processDataRequest(id: string, action: "complete" | "reject" | "anonymise", userId: string | null, response: string): Res {
  try {
    const { supabase } = await guard();
    if (action === "anonymise") {
      if (!userId) return { ok: false, error: "This request has no linked account (already deleted?)." };
      // Remove private photos first (needs the storage API)
      for (const [bucket, table, fk] of [
        ["submission-images", "seller_submissions", "seller_submission_images"],
        ["repair-images", "repair_bookings", "repair_images"],
      ] as const) {
        const { data: parents } = await supabase.from(table).select("id").eq("user_id", userId);
        const ids = (parents ?? []).map((p) => p.id);
        if (!ids.length) continue;
        const col = fk === "seller_submission_images" ? "submission_id" : "repair_id";
        const { data: imgs } = await supabase.from(fk).select("storage_path").in(col, ids);
        const paths = (imgs ?? []).map((i) => i.storage_path);
        if (paths.length) await supabase.storage.from(bucket).remove(paths);
        await supabase.from(fk).delete().in(col, ids);
      }
      const { error } = await supabase.rpc("admin_anonymise_user", { p_user_id: userId, p_response: response || undefined });
      if (error) return { ok: false, error: friendlyDbError(error) };
    } else {
      const { error } = await supabase
        .from("data_requests")
        .update({ status: action === "complete" ? "completed" : "rejected", admin_response: response || null, completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return { ok: false, error: friendlyDbError(error) };
    }
    after(safeFlush);
    revalidatePath("/admin/customers");
    return { ok: true, message: action === "anonymise" ? "Account deleted and records anonymised." : "Request updated." };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Settings & content
// ---------------------------------------------------------------------------
const TEXT_KEYS = [
  "announcement", "hero_title", "hero_subtitle", "about_body", "repairs_intro",
  "policy_privacy", "policy_terms", "policy_returns", "collection_address", "bank_details",
  "whatsapp_number", "contact_email", "social_handle", "closed_notice",
] as const;

export async function saveSettings(_prev: ActionResult | null, formData: FormData): Res {
  try {
    const { supabase } = await guard();
    const rows: { key: string; value: unknown; is_public: boolean }[] = [];
    for (const key of TEXT_KEYS) {
      if (!formData.has(key)) continue;
      const v = String(formData.get(key) ?? "").trim().slice(0, 20000);
      if (["whatsapp_number", "contact_email", "closed_notice", "social_handle"].includes(key) && !v)
        return { ok: false, error: "Contact details cannot be empty.", fieldErrors: { [key]: "Required" } };
      if (key === "whatsapp_number" && !/^[0-9 +()-]{9,20}$/.test(v)) return { ok: false, error: "Enter a valid WhatsApp number.", fieldErrors: { whatsapp_number: "Invalid number" } };
      if (key === "contact_email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return { ok: false, error: "Enter a valid email address.", fieldErrors: { contact_email: "Invalid email" } };
      rows.push({ key, value: v || null, is_public: !["collection_address", "bank_details"].includes(key) });
    }
    if (formData.has("reservation_hold_days")) {
      const d = Math.min(30, Math.max(1, Number(formData.get("reservation_hold_days")) || 3));
      rows.push({ key: "reservation_hold_days", value: d, is_public: true });
    }
    if (formData.has("repair_prices_json")) {
      try {
        const prices = JSON.parse(String(formData.get("repair_prices_json") || "[]"));
        const clean = z.array(z.object({ service: z.string(), price: z.string().trim().min(1).max(60), note: z.string().max(200).optional() })).parse(prices);
        rows.push({ key: "repair_prices", value: clean, is_public: true });
      } catch {
        return { ok: false, error: "Repair prices could not be saved — check each row has a price." };
      }
    }
    if (formData.has("hero_image_path")) {
      rows.push({ key: "hero_image_path", value: String(formData.get("hero_image_path") || "") || null, is_public: true });
    }
    for (const row of rows) {
      const { error } = await supabase.from("site_settings").upsert(row as never);
      if (error) return { ok: false, error: friendlyDbError(error) };
    }
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved. Changes are live on the website." };
  } catch (e) {
    return fail(e);
  }
}

export async function loadDemoData(): Res {
  try {
    const { supabase } = await guard();
    const { data, error } = await supabase.rpc("admin_load_demo_data");
    if (error) return { ok: false, error: friendlyDbError(error) };
    revalidatePath("/", "layout");
    return { ok: true, message: `${data} demo products added (clearly labelled "Demo").` };
  } catch (e) {
    return fail(e);
  }
}

export async function removeDemoData(): Res {
  try {
    const { supabase } = await guard();
    const { data, error } = await supabase.rpc("admin_remove_demo_data");
    if (error) return { ok: false, error: friendlyDbError(error) };
    revalidatePath("/", "layout");
    return { ok: true, message: `${data} demo products removed.` };
  } catch (e) {
    return fail(e);
  }
}

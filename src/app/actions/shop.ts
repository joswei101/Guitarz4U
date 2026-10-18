"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { getProductsByIds } from "@/lib/data/products";
import {
  type ActionResult,
  fieldErrors,
  formDataToObject,
  friendlyDbError,
  purchaseRequestSchema,
  reservationSchema,
} from "@/lib/validation";
import { safeFlush } from "@/lib/email";

export async function toggleWishlist(productId: string): Promise<ActionResult<{ saved: boolean }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in to save items to your wishlist." };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", productId);
    if (error) return { ok: false, error: friendlyDbError(error) };
    revalidatePath("/account/wishlist");
    return { ok: true, data: { saved: false } };
  }
  const { error } = await supabase.from("wishlists").insert({ user_id: user.id, product_id: productId });
  if (error) return { ok: false, error: friendlyDbError(error) };
  await supabase.rpc("track_event", { p_type: "wishlist_add", p_product_id: productId });
  revalidatePath("/account/wishlist");
  return { ok: true, data: { saved: true } };
}

export async function toggleAvailabilityAlert(productId: string): Promise<ActionResult<{ active: boolean }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in to be notified." };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("availability_alerts")
    .select("id, notified_at")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();
  if (existing && !existing.notified_at) {
    await supabase.from("availability_alerts").delete().eq("id", existing.id);
    return { ok: true, data: { active: false }, message: "You will no longer be notified." };
  }
  if (existing) await supabase.from("availability_alerts").delete().eq("id", existing.id);
  const { error } = await supabase.from("availability_alerts").insert({ user_id: user.id, product_id: productId });
  if (error) return { ok: false, error: friendlyDbError(error) };
  return { ok: true, data: { active: true }, message: "We'll notify you in your account if this item becomes available." };
}

/** Fresh product details for the cart (prices/availability straight from the database). */
export async function getCartProducts(ids: string[]) {
  const clean = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 20);
  return getProductsByIds(clean);
}

export async function submitPurchaseRequest(
  input: unknown,
): Promise<ActionResult<{ id: string; reference: string }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in to submit your request." };
  const parsed = purchaseRequestSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_purchase_request", {
    p_items: v.items,
    p_contact_name: v.contact_name,
    p_contact_phone: v.contact_phone ?? "",
    p_contact_email: v.contact_email ?? "",
    p_preferred_contact: v.preferred_contact,
    p_message: v.message,
  });
  if (error || !data?.[0]) return { ok: false, error: friendlyDbError(error) };
  after(safeFlush);
  revalidatePath("/account");
  return { ok: true, data: { id: data[0].id, reference: data[0].reference } };
}

export async function requestReservation(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (formData.get("website")) return { ok: false, error: "Submission rejected." };
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in to request a reservation." };
  const parsed = reservationSchema.safeParse(formDataToObject(formData));
  if (!parsed.success)
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_reservation", {
    p_product_id: v.product_id,
    p_contact_name: v.contact_name,
    p_contact_phone: v.contact_phone ?? "",
    p_contact_email: v.contact_email ?? "",
    p_preferred_contact: v.preferred_contact,
    p_message: v.message,
  });
  if (error || !data?.[0]) return { ok: false, error: friendlyDbError(error) };
  after(safeFlush);
  redirect(`/account/reservations/${data[0].id}?submitted=1`);
}

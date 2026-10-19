"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { fail, formToObject, success, zodFieldErrors, type ActionState } from "@/lib/actions";
import { contactDetailsSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/errors";
import { emailAdmin } from "@/lib/email";

export async function toggleWishlistAction(productId: string): Promise<{ ok: boolean; saved?: boolean; message?: string; loginRequired?: boolean }> {
  if (!z.uuid().safeParse(productId).success) return { ok: false, message: "Invalid product." };
  const user = await getUser();
  if (!user) return { ok: false, loginRequired: true, message: "Please sign in to save guitars to your wishlist." };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", productId);
    if (error) return { ok: false, message: friendlyError(error) };
    revalidatePath("/account/wishlist");
    return { ok: true, saved: false };
  }
  const { error } = await supabase.from("wishlists").insert({ user_id: user.id, product_id: productId });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/account/wishlist");
  return { ok: true, saved: true };
}

const alertSchema = z.object({
  product_id: z.uuid().optional(),
  category_id: z.coerce.number().int().positive().optional(),
  brand_id: z.coerce.number().int().positive().optional(),
});

export async function createAlertAction(input: { productId?: string; categoryId?: number; brandId?: number }) {
  const user = await getUser();
  if (!user) return { ok: false, loginRequired: true, message: "Please sign in to set up alerts." };
  const parsed = alertSchema.safeParse({ product_id: input.productId, category_id: input.categoryId, brand_id: input.brandId });
  if (!parsed.success) return { ok: false, message: "Invalid alert." };
  const supabase = await createClient();
  const { count } = await supabase.from("availability_alerts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_active", true);
  if ((count ?? 0) >= 20) return { ok: false, message: "You can have up to 20 active alerts. Remove some in your account first." };
  const { error } = await supabase.from("availability_alerts").insert({
    user_id: user.id,
    product_id: parsed.data.product_id ?? null,
    category_id: parsed.data.category_id ?? null,
    brand_id: parsed.data.brand_id ?? null,
  });
  if (error && error.code !== "23505") return { ok: false, message: friendlyError(error) };
  revalidatePath("/account/alerts");
  return { ok: true, message: "Alert saved. We'll notify you in your account." };
}

export async function requestReservationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getUser();
  if (!user) return fail("Please sign in to request a reservation.");
  const productId = String(formData.get("product_id") ?? "");
  if (!z.uuid().safeParse(productId).success) return fail("Invalid product.");
  const parsed = contactDetailsSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_reservation", {
    p_product_id: productId,
    p_contact_name: v.contact_name,
    p_contact_email: v.contact_email ?? "",
    p_contact_phone: v.contact_phone ?? "",
    p_preferred_contact: v.preferred_contact,
    p_message: v.message ?? "",
  });
  if (error) return fail(friendlyError(error));
  const row = Array.isArray(data) ? data[0] : data;
  await emailAdmin(`New reservation request ${row?.reference ?? ""}`, `${v.contact_name} requested a reservation.`, "/admin/reservations");
  revalidatePath("/account/reservations");
  return success(
    `Reservation request ${row?.reference ?? ""} received. It is not confirmed until Guitarz4U approves it — we'll contact you shortly.`,
    { reference: row?.reference ?? "" },
  );
}

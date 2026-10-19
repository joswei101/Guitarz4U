"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { fail, formToObject, success, zodFieldErrors, type ActionState } from "@/lib/actions";
import { contactDetailsSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/errors";
import { emailAdmin, sendEmail } from "@/lib/email";
import { PURCHASE_SUCCESS_MESSAGE } from "@/lib/constants";
import { formatZAR } from "@/lib/format";

export type CartAvailability = Record<string, { status: "available" | "reserved" | "unavailable"; price: number | null; title: string | null }>;

/** Returns the live status and price of each item in the visitor's cart. */
export async function checkCartAvailabilityAction(ids: string[]): Promise<CartAvailability> {
  const valid = ids.filter((id) => z.uuid().safeParse(id).success).slice(0, 10);
  if (!valid.length) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("id, title, price, status").in("id", valid);
  const user = await getUser();
  let myReserved = new Set<string>();
  if (user) {
    const { data: res } = await supabase.from("reservations").select("product_id").eq("user_id", user.id).eq("status", "approved");
    myReserved = new Set((res ?? []).map((r: { product_id: string }) => r.product_id));
  }
  const out: CartAvailability = {};
  for (const id of valid) {
    const row = (data ?? []).find((p: { id: string }) => p.id === id) as { id: string; title: string; price: number; status: string } | undefined;
    if (!row) out[id] = { status: "unavailable", price: null, title: null };
    else
      out[id] = {
        status: row.status === "published" || (row.status === "reserved" && myReserved.has(id)) ? "available" : row.status === "reserved" ? "reserved" : "unavailable",
        price: Number(row.price),
        title: row.title,
      };
  }
  return out;
}

export async function submitPurchaseRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getUser();
  if (!user) return fail("Please sign in to submit a purchase request.");

  const productIds = formData.getAll("product_ids").map(String).filter((id) => z.uuid().safeParse(id).success);
  if (!productIds.length) return fail("Your request cart is empty.");

  const parsed = contactDetailsSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  if (formData.get("understand") !== "on") {
    return fail("Please confirm that you understand no payment is taken online.", { understand: "Please tick this box to continue." });
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_purchase_request", {
    p_product_ids: productIds,
    p_contact_name: v.contact_name,
    p_contact_email: v.contact_email ?? "",
    p_contact_phone: v.contact_phone ?? "",
    p_preferred_contact: v.preferred_contact,
    p_message: v.message ?? "",
  });
  if (error) return fail(friendlyError(error));
  const row = (Array.isArray(data) ? data[0] : data) as { id: string; reference: string } | undefined;
  if (!row) return fail("Something went wrong. Please try again.");

  // Optional emails. In-app notifications are always created by the database.
  const { data: req } = await supabase.from("purchase_requests").select("estimated_total").eq("id", row.id).single();
  await Promise.all([
    emailAdmin(
      `New purchase request ${row.reference}`,
      `${v.contact_name} requested ${productIds.length} item(s), estimated ${formatZAR(req?.estimated_total)}.\nPreferred contact: ${v.preferred_contact}.`,
      `/admin/requests/${row.id}`,
    ),
    sendEmail(v.contact_email, `Purchase request ${row.reference} received`, PURCHASE_SUCCESS_MESSAGE, `/account/requests/${row.id}`),
  ]);

  revalidatePath("/account/requests");
  return success(PURCHASE_SUCCESS_MESSAGE, { reference: row.reference, id: row.id });
}

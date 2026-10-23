"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { fail, formToObject, success, zodFieldErrors, type ActionState } from "@/lib/actions";
import { friendlyError } from "@/lib/errors";
import { contactMethod, saPhone } from "@/lib/validation";
import { emailAdmin } from "@/lib/email";

const id = z.uuid();

async function rpcAction(fn: string, args: Record<string, unknown>, paths: string[], okMessage: string): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) return fail(friendlyError(error));
  paths.forEach((p) => revalidatePath(p));
  return success(okMessage);
}

export async function cancelPurchaseRequestAction(_prev: ActionState, formData: FormData) {
  const rid = id.safeParse(formData.get("id"));
  if (!rid.success) return fail("Invalid request.");
  return rpcAction("cancel_purchase_request", { p_request_id: rid.data }, ["/account/requests", `/account/requests/${rid.data}`], "Your purchase request has been cancelled.");
}

export async function cancelReservationAction(_prev: ActionState, formData: FormData) {
  const rid = id.safeParse(formData.get("id"));
  if (!rid.success) return fail("Invalid reservation.");
  return rpcAction("cancel_reservation", { p_reservation_id: rid.data }, ["/account/reservations"], "Your reservation has been cancelled.");
}

export async function withdrawSubmissionAction(_prev: ActionState, formData: FormData) {
  const rid = id.safeParse(formData.get("id"));
  if (!rid.success) return fail("Invalid submission.");
  return rpcAction("withdraw_seller_submission", { p_submission_id: rid.data }, ["/account/selling", `/account/selling/${rid.data}`], "Your submission has been withdrawn.");
}

export async function respondOfferAction(_prev: ActionState, formData: FormData) {
  const offerId = id.safeParse(formData.get("offer_id"));
  const subId = id.safeParse(formData.get("submission_id"));
  const decision = formData.get("decision");
  if (!offerId.success || !subId.success || (decision !== "accept" && decision !== "decline")) return fail("Invalid offer.");
  const res = await rpcAction(
    "respond_seller_offer",
    { p_offer_id: offerId.data, p_accept: decision === "accept" },
    ["/account/selling", `/account/selling/${subId.data}`],
    decision === "accept"
      ? "Thank you — you've accepted the offer. Guitarz4U will contact you to arrange the next steps."
      : "You've declined the offer. Guitarz4U has been notified.",
  );
  if (res.ok) await emailAdmin(`Seller offer ${decision === "accept" ? "accepted" : "declined"}`, "A seller responded to your offer.", `/admin/submissions/${subId.data}`);
  return res;
}

export async function respondQuoteAction(_prev: ActionState, formData: FormData) {
  const bid = id.safeParse(formData.get("id"));
  const decision = formData.get("decision");
  if (!bid.success || (decision !== "accept" && decision !== "decline")) return fail("Invalid quote response.");
  const res = await rpcAction(
    "respond_repair_quote",
    { p_booking_id: bid.data, p_accept: decision === "accept" },
    ["/account/repairs", `/account/repairs/${bid.data}`],
    decision === "accept"
      ? "Thank you — you've accepted the quote. Guitarz4U will confirm your booking with you. Work will not start until it's confirmed."
      : "You've declined the quote. Guitarz4U has been notified.",
  );
  if (res.ok) await emailAdmin(`Repair quote ${decision === "accept" ? "accepted" : "declined"}`, "A customer responded to a repair quote.", `/admin/repairs/${bid.data}`);
  return res;
}

export async function cancelRepairAction(_prev: ActionState, formData: FormData) {
  const bid = id.safeParse(formData.get("id"));
  if (!bid.success) return fail("Invalid booking.");
  return rpcAction("cancel_repair_booking", { p_booking_id: bid.data }, ["/account/repairs", `/account/repairs/${bid.data}`], "Your repair booking has been cancelled.");
}

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your name.").max(120),
  phone: saPhone.optional().default(""),
  preferred_contact: contactMethod,
});

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, phone: parsed.data.phone || null, preferred_contact: parsed.data.preferred_contact })
    .eq("id", user.id);
  if (error) return fail(friendlyError(error));
  revalidatePath("/account", "layout");
  return success("Your details have been saved.");
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/", "layout");
}

export async function deleteAlertAction(formData: FormData) {
  const user = await requireUser();
  const aid = id.safeParse(formData.get("id"));
  if (!aid.success) return;
  const supabase = await createClient();
  await supabase.from("availability_alerts").delete().eq("id", aid.data).eq("user_id", user.id);
  revalidatePath("/account/alerts");
}

export async function removeWishlistAction(formData: FormData) {
  const user = await requireUser();
  const pid = id.safeParse(formData.get("product_id"));
  if (!pid.success) return;
  const supabase = await createClient();
  await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", pid.data);
  revalidatePath("/account/wishlist");
}

export async function requestDeletionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  if (formData.get("confirm") !== "on") return fail("Please confirm that you want your account deleted.", { confirm: "Please tick this box." });
  const reason = String(formData.get("reason") ?? "").slice(0, 1000);
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_data_action", { p_type: "deletion", p_reason: reason });
  if (error) return fail(friendlyError(error));
  await emailAdmin("Account deletion request", "A customer has requested deletion of their account (POPIA).", "/admin/customers");
  revalidatePath("/account/privacy");
  return success("Your deletion request has been received. Guitarz4U will process it and confirm with you. Business records required by law are kept in anonymised form.");
}

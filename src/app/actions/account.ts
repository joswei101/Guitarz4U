"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { safeFlush } from "@/lib/email";
import { type ActionResult, fieldErrors, formDataToObject, friendlyDbError, profileSchema } from "@/lib/validation";

async function rpcAction(fn: () => PromiseLike<{ error: { message?: string; code?: string; hint?: string } | null }>, path: string, message: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const { error } = await fn();
  if (error) return { ok: false, error: friendlyDbError(error) };
  after(safeFlush);
  revalidatePath(path);
  return { ok: true, message };
}

export async function updateProfile(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const parsed = profileSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { ok: false, error: friendlyDbError(error) };
  revalidatePath("/account", "layout");
  return { ok: true, message: "Your details have been saved." };
}

export async function cancelPurchaseRequest(id: string) {
  const supabase = await createClient();
  return rpcAction(() => supabase.rpc("cancel_purchase_request", { p_id: id }), `/account/requests/${id}`, "Request cancelled.");
}

export async function cancelReservation(id: string) {
  const supabase = await createClient();
  return rpcAction(() => supabase.rpc("cancel_reservation", { p_id: id }), `/account/reservations/${id}`, "Reservation cancelled.");
}

export async function withdrawSubmission(id: string) {
  const supabase = await createClient();
  return rpcAction(() => supabase.rpc("withdraw_seller_submission", { p_id: id }), `/account/submissions/${id}`, "Submission withdrawn.");
}

export async function replyToSubmission(id: string, message: string) {
  const supabase = await createClient();
  return rpcAction(
    () => supabase.rpc("reply_to_seller_submission", { p_id: id, p_message: message }),
    `/account/submissions/${id}`,
    "Reply sent.",
  );
}

export async function respondToOffer(offerId: string, submissionId: string, accept: boolean) {
  const supabase = await createClient();
  return rpcAction(
    () => supabase.rpc("respond_to_offer", { p_offer_id: offerId, p_accept: accept }),
    `/account/submissions/${submissionId}`,
    accept ? "Offer accepted — we'll contact you to arrange the handover." : "Offer declined.",
  );
}

export async function respondToQuote(id: string, accept: boolean) {
  const supabase = await createClient();
  return rpcAction(
    () => supabase.rpc("respond_to_repair_quote", { p_id: id, p_accept: accept }),
    `/account/repairs/${id}`,
    accept ? "Quote accepted. We'll confirm the next steps with you before work starts." : "Quote declined.",
  );
}

export async function replyToRepair(id: string, message: string) {
  const supabase = await createClient();
  return rpcAction(() => supabase.rpc("reply_to_repair_booking", { p_id: id, p_message: message }), `/account/repairs/${id}`, "Reply sent.");
}

export async function cancelRepair(id: string) {
  const supabase = await createClient();
  return rpcAction(() => supabase.rpc("cancel_repair_booking", { p_id: id }), `/account/repairs/${id}`, "Booking cancelled.");
}

export async function markNotificationsRead(ids?: string[]) {
  const supabase = await createClient();
  return rpcAction(() => supabase.rpc("mark_notifications_read", { p_ids: ids }), "/account/notifications", "Marked as read.");
}

export async function deletePendingReview(id: string) {
  const supabase = await createClient();
  return rpcAction(() => supabase.from("reviews").delete().eq("id", id).eq("status", "pending"), "/account/reviews", "Review deleted.");
}

export async function requestAccountDeletion(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  if (formData.get("confirm") !== "DELETE") return { ok: false, error: 'Type DELETE to confirm.', fieldErrors: { confirm: 'Type DELETE in capital letters' } };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("data_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("request_type", "deletion")
    .eq("status", "pending")
    .maybeSingle();
  if (existing) return { ok: false, error: "You already have a pending deletion request." };
  const reason = String(formData.get("reason") ?? "").slice(0, 1000);
  const { error } = await supabase.from("data_requests").insert({ user_id: user.id, request_type: "deletion", reason: reason || null });
  if (error) return { ok: false, error: friendlyDbError(error) };
  after(safeFlush);
  revalidatePath("/account/privacy");
  return { ok: true, message: "Your deletion request has been sent. We'll process it and let you know." };
}

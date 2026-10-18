"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { safeFlush } from "@/lib/email";
import {
  type ActionResult,
  contactMessageSchema,
  fieldErrors,
  formDataToObject,
  friendlyDbError,
  repairBookingSchema,
  reviewSchema,
  sellerSubmissionSchema,
} from "@/lib/validation";

export async function createSellerSubmission(formData: FormData): Promise<ActionResult<{ id: string; reference: string }>> {
  if (formData.get("website")) return { ok: false, error: "Submission rejected." };
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in to submit your guitar." };
  const parsed = sellerSubmissionSchema.safeParse(formDataToObject(formData));
  if (!parsed.success)
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { not_loose_parts, ...v } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seller_submissions")
    .insert({ ...v, user_id: user.id })
    .select("id, reference")
    .single();
  if (error || !data) return { ok: false, error: friendlyDbError(error) };
  await supabase.rpc("track_event", { p_type: "seller_submission" });
  after(safeFlush);
  revalidatePath("/account");
  return { ok: true, data };
}

export async function createRepairBooking(formData: FormData): Promise<ActionResult<{ id: string; reference: string }>> {
  if (formData.get("website")) return { ok: false, error: "Submission rejected." };
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in to book a repair." };
  const parsed = repairBookingSchema.safeParse(formDataToObject(formData, ["requested_services"]));
  if (!parsed.success)
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { privacy_consent, ...v } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("repair_bookings")
    .insert({ ...v, user_id: user.id })
    .select("id, reference")
    .single();
  if (error || !data) return { ok: false, error: friendlyDbError(error) };
  await supabase.rpc("track_event", { p_type: "repair_booking" });
  after(safeFlush);
  revalidatePath("/account");
  return { ok: true, data };
}

export async function submitReview(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (formData.get("website")) return { ok: false, error: "Submission rejected." };
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in to write a review." };
  const parsed = reviewSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  // Basic spam heuristics: links are not allowed in reviews
  if (/https?:\/\/|www\./i.test(parsed.data.body + parsed.data.title))
    return { ok: false, error: "Please remove links from your review.", fieldErrors: { body: "Links are not allowed" } };
  const supabase = await createClient();
  const { error } = await supabase.from("reviews").insert({ ...parsed.data, user_id: user.id });
  if (error) return { ok: false, error: friendlyDbError(error) };
  after(safeFlush);
  revalidatePath("/account/reviews");
  return { ok: true, message: "Thank you! Your review has been submitted and will appear once it has been approved." };
}

export async function reportReview(reviewId: string, reason: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in to report a review." };
  const r = reason.trim();
  if (r.length < 5 || r.length > 500) return { ok: false, error: "Please give a short reason (5–500 characters)." };
  const supabase = await createClient();
  const { error } = await supabase.from("review_reports").insert({ review_id: reviewId, reason: r, reporter_id: user.id });
  if (error) return { ok: false, error: error.code === "23505" ? "You have already reported this review." : friendlyDbError(error) };
  return { ok: true, message: "Thank you — we'll take a look." };
}

export async function sendContactMessage(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (formData.get("website")) return { ok: true, message: "Thank you, your message has been sent." };
  const parsed = contactMessageSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_contact_message", {
    p_name: v.name,
    p_email: v.email ?? "",
    p_phone: v.phone ?? "",
    p_subject: v.subject,
    p_message: v.message,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };
  after(safeFlush);
  return { ok: true, message: "Thank you, your message has been sent. We'll reply as soon as we can." };
}

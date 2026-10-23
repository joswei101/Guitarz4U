"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { fail, formToObject, isBot, success, zodFieldErrors, type ActionState } from "@/lib/actions";
import { reviewSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/errors";
import { emailAdmin } from "@/lib/email";

export async function submitReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (isBot(formData)) return success("Thank you for your review.");
  const user = await getUser();
  if (!user) return fail("Please sign in to write a review.");
  const parsed = reviewSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_review", {
    p_rating: parsed.data.rating,
    p_title: parsed.data.title,
    p_body: parsed.data.body,
  });
  if (error) return fail(friendlyError(error));
  await emailAdmin("New review awaiting moderation", parsed.data.title, "/admin/reviews");
  revalidatePath("/reviews");
  return success("Thank you! Your review has been submitted and will appear once it has been approved.");
}

const reportSchema = z.object({
  review_id: z.uuid(),
  reason: z.string().trim().min(5, "Please tell us a little more.").max(1000),
});

export async function reportReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = reportSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_review", { p_review_id: parsed.data.review_id, p_reason: parsed.data.reason });
  if (error) return fail(friendlyError(error));
  return success("Thank you. The report has been sent to Guitarz4U for review.");
}

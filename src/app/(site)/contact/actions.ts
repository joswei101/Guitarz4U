"use server";

import { createClient } from "@/lib/supabase/server";
import { fail, formToObject, isBot, success, zodFieldErrors, type ActionState } from "@/lib/actions";
import { enquirySchema } from "@/lib/validation";
import { friendlyError } from "@/lib/errors";
import { emailAdmin } from "@/lib/email";

export async function submitEnquiryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (isBot(formData)) return success("We'll be in touch soon.");
  const parsed = enquirySchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_enquiry", {
    p_name: v.name,
    p_email: v.email ?? "",
    p_phone: v.phone ?? "",
    p_subject: v.subject,
    p_message: v.message,
    p_product_id: v.product_id ?? null,
  });
  if (error) return fail(friendlyError(error));

  await emailAdmin(`New enquiry: ${v.subject}`, `${v.name} sent a message:\n\n${v.message}`, "/admin/enquiries");
  return success("We'll get back to you on your preferred channel as soon as we can.");
}

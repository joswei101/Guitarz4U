"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { fail, formToObject, isBot, success, zodFieldErrors, type ActionState } from "@/lib/actions";
import { repairBookingSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/errors";
import { emailAdmin, sendEmail } from "@/lib/email";

const RECEIPT =
  "Thank you — your repair booking request has been received. Guitarz4U will assess it and contact you with a quote. Your appointment is not confirmed yet, and no work will start without your approval.";

export async function submitRepairAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (isBot(formData)) return success(RECEIPT);
  const user = await getUser();
  if (!user) return fail("Please sign in to book a repair.");
  const parsed = repairBookingSchema.safeParse(formToObject(formData, ["services", "image_paths"]));
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  if (v.image_paths.length > 6) return fail("Please upload no more than 6 photographs.");
  if (v.image_paths.some((p) => !p.startsWith(`${user.id}/`))) return fail("One of the photographs could not be verified. Please upload it again.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_repair_booking", {
    p_contact_name: v.contact_name,
    p_contact_phone: v.contact_phone,
    p_contact_email: v.contact_email ?? "",
    p_preferred_contact: v.preferred_contact,
    p_guitar_brand: v.guitar_brand,
    p_guitar_model: v.guitar_model,
    p_category_id: v.category_id ?? null,
    p_services: v.services,
    p_problem_description: v.problem_description,
    p_preferred_date: v.preferred_date ?? null,
    p_notes: v.notes,
    p_image_paths: v.image_paths,
  });
  if (error) return fail(friendlyError(error));
  const row = (Array.isArray(data) ? data[0] : data) as { id: string; reference: string };

  await Promise.all([
    emailAdmin(`New repair booking ${row.reference}`, `${v.contact_name}: ${v.guitar_brand} ${v.guitar_model}\n${v.problem_description}`, `/admin/repairs/${row.id}`),
    sendEmail(v.contact_email ?? user.email, `Repair booking ${row.reference} received`, RECEIPT, `/account/repairs/${row.id}`),
  ]);
  revalidatePath("/account/repairs");
  return success(RECEIPT, { reference: row.reference, id: row.id });
}

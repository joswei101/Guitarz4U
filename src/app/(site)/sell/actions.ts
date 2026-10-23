"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { fail, formToObject, isBot, success, zodFieldErrors, type ActionState } from "@/lib/actions";
import { sellerSubmissionSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/errors";
import { emailAdmin, sendEmail } from "@/lib/email";

const RECEIPT =
  "Thank you — your guitar has been submitted. Guitarz4U will review it personally and contact you. Receiving your submission is not an agreement to buy, and no price has been agreed yet.";

export async function submitSellerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (isBot(formData)) return success(RECEIPT);
  const user = await getUser();
  if (!user) return fail("Please sign in to submit your guitar.");
  const parsed = sellerSubmissionSchema.safeParse(formToObject(formData, ["image_paths"]));
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  if (v.image_paths.some((p) => !p.startsWith(`${user.id}/`))) return fail("One of the photographs could not be verified. Please upload it again.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_seller_submission", {
    p_seller_name: v.seller_name,
    p_contact_number: v.contact_number,
    p_email: v.email ?? "",
    p_brand: v.brand,
    p_model: v.model,
    p_category_id: v.category_id,
    p_condition: v.condition,
    p_is_working: v.is_working,
    p_fault_description: v.fault_description,
    p_asking_price: v.asking_price ?? null,
    p_notes: v.notes,
    p_privacy_acknowledged: true,
    p_not_loose_parts: true,
    p_image_paths: v.image_paths,
  });
  if (error) return fail(friendlyError(error));
  const row = (Array.isArray(data) ? data[0] : data) as { id: string; reference: string };

  await Promise.all([
    emailAdmin(`New seller submission ${row.reference}`, `${v.seller_name} submitted a ${v.brand} ${v.model} (${v.image_paths.length} photo(s)).`, `/admin/submissions/${row.id}`),
    sendEmail(v.email ?? user.email, `Seller submission ${row.reference} received`, RECEIPT, `/account/selling/${row.id}`),
  ]);
  revalidatePath("/account/selling");
  return success(RECEIPT, { reference: row.reference, id: row.id });
}

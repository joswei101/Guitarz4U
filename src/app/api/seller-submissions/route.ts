import { publicFormHandler, formToObject, ok } from "@/lib/api";
import { sellerSubmissionSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/session";
import { transaction } from "@/lib/db";
import { makeReference } from "@/lib/reference";
import { addHistory } from "@/lib/workflow";
import { notifyAdmin, notifyCustomer } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { getImageFiles, processAndStoreImage } from "@/lib/images";
import { deleteObject } from "@/lib/storage";
import { parseRandToCents } from "@/lib/format";

export async function POST(req: Request) {
  return publicFormHandler(req, { bucket: "seller", limit: 5, windowSeconds: 3600 }, async (form) => {
    const d = sellerSubmissionSchema.parse(formToObject(form));
    const files = getImageFiles(form, "photos", 8);
    const user = await getCurrentUser();
    const reference = makeReference("SL");
    // Store photos first (validated and stripped of metadata); remove them again if saving fails.
    const stored: string[] = [];
    try {
      for (const f of files) stored.push((await processAndStoreImage(f, "private", "sellers")).key);
      const id = await transaction(async (c) => {
        const r = await c.query<{ id: string }>(
          `insert into seller_submissions (reference, user_id, seller_name, contact_phone, email, brand, model, category_id, condition, works, faults, asking_price_cents, notes, privacy_ack)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true) returning id`,
          [reference, user?.id ?? null, d.name, d.phone, d.email, d.brand, d.model, d.categoryId, d.condition, d.works, d.faults, d.askingPrice ? parseRandToCents(d.askingPrice) : null, d.notes],
        );
        const id = r.rows[0].id;
        for (const key of stored) await c.query("insert into seller_submission_images (submission_id, storage_key) values ($1,$2)", [id, key]);
        await addHistory("seller_submission", id, "submitted", "Thank you — your guitar details were received. Guitarz4U will review them and contact you. This is not an offer or a promise to buy.", user?.id ?? null, c);
        return id;
      });
      await notifyAdmin("seller_submission", `Guitar offered to you: ${d.brand} ${d.model}`.trim(), `${d.name} (${d.phone}) submitted a ${d.brand} ${d.model}. Works: ${d.works}. ${stored.length} photo(s). Reference ${reference}.`, `/admin/submissions/${id}`);
      await notifyCustomer({
        userId: user?.id ?? null,
        email: d.email || null,
        kind: "seller_submission",
        title: `Guitar submission received (${reference})`,
        body: `Thank you, ${d.name}. We received the details of your ${d.brand} ${d.model}. We will review them and contact you personally. Submitting a guitar is not an offer or a promise to buy.`,
        link: user ? "/account/submissions" : `/track?ref=${reference}`,
      });
      await track("seller_submission");
      return ok({ reference });
    } catch (err) {
      await Promise.all(stored.map((k) => deleteObject("private", k)));
      throw err;
    }
  });
}

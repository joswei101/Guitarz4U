import { publicFormHandler, formToObject, ok } from "@/lib/api";
import { repairBookingSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/session";
import { transaction } from "@/lib/db";
import { makeReference } from "@/lib/reference";
import { addHistory } from "@/lib/workflow";
import { notifyAdmin, notifyCustomer } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { getImageFiles, processAndStoreImage } from "@/lib/images";
import { deleteObject } from "@/lib/storage";
import { REPAIR_SERVICES } from "@/lib/format";

export async function POST(req: Request) {
  return publicFormHandler(req, { bucket: "repair", limit: 5, windowSeconds: 3600 }, async (form) => {
    const d = repairBookingSchema.parse(formToObject(form, ["services"]));
    const files = getImageFiles(form, "photos", 6);
    const user = await getCurrentUser();
    const reference = makeReference("RP");
    const stored: string[] = [];
    try {
      for (const f of files) stored.push((await processAndStoreImage(f, "private", "repairs")).key);
      const id = await transaction(async (c) => {
        const r = await c.query<{ id: string }>(
          `insert into repair_bookings (reference, user_id, customer_name, contact_phone, email, preferred_contact, guitar_brand, guitar_model, category_id, problem, services, preferred_date, notes)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id`,
          [reference, user?.id ?? null, d.name, d.phone, d.email, d.preferredContact, d.brand, d.model, d.categoryId, d.problem, d.services, d.preferredDate || null, d.notes],
        );
        const id = r.rows[0].id;
        for (const key of stored) await c.query("insert into repair_images (repair_id, storage_key) values ($1,$2)", [id, key]);
        await addHistory("repair_booking", id, "submitted", "Repair booking received. Your preferred date is a request only — Guitarz4U will assess the work, send a quote and confirm a date with you. No work starts without your approval.", user?.id ?? null, c);
        return id;
      });
      const services = d.services.map((s) => REPAIR_SERVICES[s]).join(", ") || "not specified";
      await notifyAdmin("repair_booking", `Repair booking: ${d.brand} ${d.model}`.trim(), `${d.name} (${d.phone}) — ${services}.\n${d.problem.slice(0, 300)}\nReference ${reference}.`, `/admin/repairs/${id}`);
      await notifyCustomer({
        userId: user?.id ?? null,
        email: d.email || null,
        kind: "repair_booking",
        title: `Repair booking received (${reference})`,
        body: `Thank you, ${d.name}. We received your repair booking for your ${d.brand} ${d.model}. This is not a confirmed appointment yet — we will assess the work, send you a quote and confirm a date personally.`,
        link: user ? "/account/repairs" : `/track?ref=${reference}`,
      });
      await track("repair_booking");
      return ok({ reference });
    } catch (err) {
      await Promise.all(stored.map((k) => deleteObject("private", k)));
      throw err;
    }
  });
}

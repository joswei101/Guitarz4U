import { publicFormHandler, formToObject, ok } from "@/lib/api";
import { contactMessageSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/session";
import { queryOne } from "@/lib/db";
import { notifyAdmin } from "@/lib/notify";

export async function POST(req: Request) {
  return publicFormHandler(req, { bucket: "contact", limit: 6, windowSeconds: 3600 }, async (form) => {
    const d = contactMessageSchema.parse(formToObject(form));
    const user = await getCurrentUser();
    let productTitle = "";
    if (d.productId) {
      const p = await queryOne<{ title: string }>("select title from products where id=$1", [d.productId]);
      productTitle = p?.title ?? "";
    }
    const row = await queryOne<{ id: string }>(
      `insert into contact_messages (kind, product_id, user_id, name, email, phone, preferred_contact, subject, message)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
      [productTitle ? "product_question" : "contact", productTitle ? d.productId : null, user?.id ?? null, d.name, d.email, d.phone, d.preferredContact, d.subject, d.message],
    );
    await notifyAdmin(
      productTitle ? "product_question" : "contact",
      productTitle ? `Question about ${productTitle}` : `New message from ${d.name}`,
      `${d.name} (${d.preferredContact}: ${d.preferredContact === "email" ? d.email : d.phone || d.email}) wrote:\n${d.message.slice(0, 500)}`,
      `/admin/messages#${row!.id}`,
    );
    return ok();
  });
}

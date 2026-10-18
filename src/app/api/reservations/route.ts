import { publicFormHandler, formToObject, ok, UserError } from "@/lib/api";
import { reservationSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/session";
import { transaction } from "@/lib/db";
import { makeReference } from "@/lib/reference";
import { addHistory } from "@/lib/workflow";
import { notifyAdmin, notifyCustomer } from "@/lib/notify";
import { track } from "@/lib/analytics";

export async function POST(req: Request) {
  return publicFormHandler(req, { bucket: "reservation", limit: 6, windowSeconds: 3600 }, async (form) => {
    const d = reservationSchema.parse(formToObject(form));
    const user = await getCurrentUser();
    const reference = makeReference("RS");
    const result = await transaction(async (c) => {
      const p = await c.query<{ id: string; title: string; status: string }>(
        "select id, title, status from products where id=$1 for update",
        [d.productId],
      );
      const product = p.rows[0];
      if (!product || product.status !== "published") {
        throw new UserError("Sorry — this guitar is no longer available to reserve.", 409);
      }
      const dup = await c.query(
        "select 1 from reservations where product_id=$1 and lower(contact_email)=lower($2) and status='requested'",
        [d.productId, d.email],
      );
      if (dup.rowCount) throw new UserError("You already have a reservation request waiting for this guitar.", 409);
      const r = await c.query<{ id: string }>(
        `insert into reservations (reference, product_id, user_id, contact_name, contact_email, contact_phone, preferred_contact, message)
         values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
        [reference, d.productId, user?.id ?? null, d.name, d.email, d.phone, d.preferredContact, d.message],
      );
      await addHistory("reservation", r.rows[0].id, "requested", "Reservation request received. It is not confirmed until Guitarz4U approves it.", user?.id ?? null, c);
      return { id: r.rows[0].id, title: product.title };
    });
    await notifyAdmin("reservation", `Reservation request: ${result.title}`, `${d.name} asked to reserve "${result.title}". Reference ${reference}.`, `/admin/reservations#${result.id}`);
    await notifyCustomer({
      userId: user?.id ?? null,
      email: d.email,
      kind: "reservation",
      title: `Reservation request received (${reference})`,
      body: `Thank you, ${d.name}. We received your request to reserve "${result.title}". It is NOT confirmed yet — we will contact you after reviewing it.`,
      link: user ? "/account/reservations" : `/track?ref=${reference}`,
    });
    await track("reservation_request", { productId: d.productId });
    return ok({ reference });
  });
}

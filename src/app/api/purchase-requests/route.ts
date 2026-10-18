import { publicFormHandler, ok, UserError } from "@/lib/api";
import { purchaseRequestSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/session";
import { transaction } from "@/lib/db";
import { makeReference } from "@/lib/reference";
import { addHistory } from "@/lib/workflow";
import { notifyAdmin, notifyCustomer } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { formatRand } from "@/lib/format";
import { jsonError } from "@/lib/http";

/**
 * Saves a purchase REQUEST. No payment is taken or requested here. Availability
 * and prices are read from the database (never trusted from the browser).
 */
export async function POST(req: Request) {
  return publicFormHandler(req, { bucket: "purchase", limit: 5, windowSeconds: 3600 }, async (form) => {
    const d = purchaseRequestSchema.parse({
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone") ?? "",
      preferredContact: form.get("preferredContact"),
      message: form.get("message") ?? "",
      productIds: [...new Set(form.getAll("productIds").map(String))],
      acknowledge: form.get("acknowledge") === "on",
    });
    const user = await getCurrentUser();
    const reference = makeReference("PR");

    const result = await transaction(async (c) => {
      const res = await c.query<{ id: string; title: string; price_cents: number; status: string }>(
        "select id, title, price_cents, status from products where id = any($1::uuid[]) order by id for update",
        [d.productIds],
      );
      const unavailable = d.productIds.filter((id) => !res.rows.find((r) => r.id === id && r.status === "published"));
      if (unavailable.length) return { unavailable };
      const items = res.rows;
      const total = items.reduce((s, i) => s + i.price_cents, 0);
      const r = await c.query<{ id: string }>(
        `insert into purchase_requests (reference, user_id, contact_name, contact_email, contact_phone, preferred_contact, message, estimated_total_cents)
         values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
        [reference, user?.id ?? null, d.name, d.email, d.phone, d.preferredContact, d.message, total],
      );
      const id = r.rows[0].id;
      for (const i of items) {
        await c.query(
          "insert into purchase_request_items (purchase_request_id, product_id, title_snapshot, price_cents_snapshot) values ($1,$2,$3,$4)",
          [id, i.id, i.title, i.price_cents],
        );
      }
      await addHistory("purchase_request", id, "submitted", "Purchase request received. No payment has been taken and the purchase is not confirmed yet.", user?.id ?? null, c);
      return { id, items, total };
    });

    if ("unavailable" in result) {
      return Response.json(
        { ok: false, error: "Some guitars in your cart are no longer available. They have been marked below — please remove them and try again.", unavailable: result.unavailable },
        { status: 409 },
      );
    }

    const list = result.items.map((i) => `• ${i.title} — ${formatRand(i.price_cents)}`).join("\n");
    await notifyAdmin(
      "purchase_request",
      `New purchase request ${reference}`,
      `${d.name} requested:\n${list}\nEstimated total ${formatRand(result.total)}. Preferred contact: ${d.preferredContact}.`,
      `/admin/requests/${result.id}`,
    );
    await notifyCustomer({
      userId: user?.id ?? null,
      email: d.email,
      kind: "purchase_request",
      title: `Purchase request received (${reference})`,
      body: `Thank you, ${d.name}. We received your purchase request for:\n${list}\n\nNo payment has been taken, and your purchase is not confirmed yet. Guitarz4U will review your request and contact you to confirm availability and arrange payment privately by EFT. Please do not make any payment until we have confirmed.`,
      link: user ? `/account/requests/${result.id}` : `/track?ref=${reference}`,
    });
    await track("purchase_request");
    return ok({ reference, id: result.id });
  });
}

export function GET() {
  return jsonError("Method not allowed", 405);
}

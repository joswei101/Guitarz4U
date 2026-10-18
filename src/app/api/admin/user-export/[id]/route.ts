import { getAdminOrNull } from "@/lib/session";
import { query, queryOne } from "@/lib/db";
import { audit } from "@/lib/audit";

// Lets the administrator fulfil a POPIA access request on a customer's behalf.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminOrNull();
  if (!admin) return new Response("Not found", { status: 404 });
  const { id } = await ctx.params;
  const uid = [id];
  const account = await queryOne(`select id, name, email, "emailVerified", "createdAt" from "user" where id=$1`, uid);
  if (!account) return new Response("Not found", { status: 404 });
  const data = {
    exportedAt: new Date().toISOString(),
    account,
    profile: await queryOne("select phone, preferred_contact from customer_profiles where user_id=$1", uid),
    purchaseRequests: await query("select reference, status, contact_name, contact_email, contact_phone, message, estimated_total_cents, created_at from purchase_requests where user_id=$1", uid),
    reservations: await query("select reference, status, contact_name, contact_email, contact_phone, message, created_at from reservations where user_id=$1", uid),
    sellerSubmissions: await query("select reference, status, seller_name, contact_phone, email, brand, model, faults, notes, created_at from seller_submissions where user_id=$1", uid),
    repairBookings: await query("select reference, status, customer_name, contact_phone, email, guitar_brand, guitar_model, problem, notes, created_at from repair_bookings where user_id=$1", uid),
    reviews: await query("select display_name, rating, title, body, status, created_at from reviews where user_id=$1", uid),
    contactMessages: await query("select subject, message, created_at from contact_messages where user_id=$1", uid),
  };
  await audit(admin, "user.export", "user", id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="customer-data-${id}.json"`, "cache-control": "no-store" },
  });
}

import { getCurrentUser } from "@/lib/session";
import { query, queryOne } from "@/lib/db";

// POPIA data export for the signed-in customer. Admin notes are excluded.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Please log in.", { status: 401 });
  const uid = [user.id];
  const data = {
    exportedAt: new Date().toISOString(),
    account: await queryOne(`select id, name, email, "emailVerified", "createdAt" from "user" where id=$1`, uid),
    profile: await queryOne("select phone, preferred_contact, created_at, updated_at from customer_profiles where user_id=$1", uid),
    purchaseRequests: await query(
      `select r.reference, r.status, r.contact_name, r.contact_email, r.contact_phone, r.preferred_contact, r.message, r.estimated_total_cents, r.customer_update, r.created_at,
        (select json_agg(json_build_object('title', i.title_snapshot, 'priceCents', i.price_cents_snapshot)) from purchase_request_items i where i.purchase_request_id=r.id) as items
       from purchase_requests r where r.user_id=$1`, uid),
    reservations: await query("select reference, status, contact_name, contact_email, contact_phone, message, expires_at, customer_update, created_at from reservations where user_id=$1", uid),
    sellerSubmissions: await query("select reference, status, seller_name, contact_phone, email, brand, model, condition, works, faults, asking_price_cents, notes, customer_update, created_at from seller_submissions where user_id=$1", uid),
    repairBookings: await query("select reference, status, customer_name, contact_phone, email, guitar_brand, guitar_model, problem, services, preferred_date, notes, quote_amount_cents, quote_message, customer_update, created_at from repair_bookings where user_id=$1", uid),
    reviews: await query("select display_name, rating, title, body, status, created_at from reviews where user_id=$1", uid),
    wishlist: await query("select p.title, w.created_at from wishlists w join products p on p.id=w.product_id where w.user_id=$1", uid),
    notifications: await query("select title, body, created_at from notifications where user_id=$1", uid),
    contactMessages: await query("select subject, message, created_at from contact_messages where user_id=$1", uid),
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="guitarz4u-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POPIA data access: returns everything linked to the signed-in user as JSON.
// Uses the customer's own session, so row level security limits the export to
// their own rows. Private administrator notes are never included.
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const uid = user.id;
  const own = (table: string, select = "*") => supabase.from(table).select(select).eq("user_id", uid);
  const [profile, requests, reservations, submissions, repairs, reviews, wishlist, alerts, notifications, enquiries, privacy] =
    await Promise.all([
      supabase.from("profiles").select("email, full_name, phone, preferred_contact, created_at, updated_at").eq("id", uid).maybeSingle(),
      own("purchase_requests", "*, items:purchase_request_items(title_snapshot, price_snapshot)"),
      own("reservations"),
      own("seller_submissions", "*, images:seller_submission_images(storage_path), offers:seller_offers(amount, message, status, created_at, responded_at)"),
      own("repair_bookings", "*, images:repair_images(storage_path)"),
      own("reviews", "rating, title, body, status, created_at"),
      own("wishlists", "created_at, product:products(title, slug)"),
      own("availability_alerts"),
      own("notifications", "title, body, link, read_at, created_at"),
      own("enquiries", "subject, message, status, created_at"),
      own("data_requests", "request_type, status, created_at, completed_at"),
    ]);

  const body = {
    exported_at: new Date().toISOString(),
    note: "Personal information held by Guitarz4U for this account. Payment details are never stored by this website.",
    account: { id: uid, email: user.email, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at },
    profile: profile.data,
    purchase_requests: requests.data,
    reservations: reservations.data,
    seller_submissions: submissions.data,
    repair_bookings: repairs.data,
    reviews: reviews.data,
    wishlist: wishlist.data,
    availability_alerts: alerts.data,
    notifications: notifications.data,
    enquiries: enquiries.data,
    privacy_requests: privacy.data,
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="guitarz4u-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

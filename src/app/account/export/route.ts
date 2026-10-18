import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POPIA access request: everything linked to the signed-in account, as JSON. RLS limits it to their own rows. */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const uid = auth.user.id;
  const [profile, requests, reservations, submissions, repairs, reviews, wishlist, alerts, notifications, dataRequests, messages] =
    await Promise.all([
      supabase.from("profiles").select("full_name, email, phone, preferred_contact, created_at").eq("id", uid).maybeSingle(),
      supabase.from("purchase_requests").select("*, items:purchase_request_items(*)").eq("user_id", uid),
      supabase.from("reservations").select("*").eq("user_id", uid),
      supabase.from("seller_submissions").select("*, offers:seller_offers(*), images:seller_submission_images(storage_path)").eq("user_id", uid),
      supabase.from("repair_bookings").select("*, images:repair_images(storage_path)").eq("user_id", uid),
      supabase.from("reviews").select("*").eq("user_id", uid),
      supabase.from("wishlists").select("created_at, product:products(title, slug)").eq("user_id", uid),
      supabase.from("availability_alerts").select("created_at, notified_at, product:products(title, slug)").eq("user_id", uid),
      supabase.from("notifications").select("title, body, created_at, read_at").eq("user_id", uid),
      supabase.from("data_requests").select("*").eq("user_id", uid),
      supabase.from("contact_messages").select("*").eq("user_id", uid),
    ]);
  const payload = {
    exported_at: new Date().toISOString(),
    note: "Personal information held by Guitarz4U for this account (POPIA section 23).",
    account: { id: uid, email: auth.user.email, created_at: auth.user.created_at },
    profile: profile.data,
    purchase_requests: requests.data,
    reservations: reservations.data,
    seller_submissions: submissions.data,
    repair_bookings: repairs.data,
    reviews: reviews.data,
    wishlist: wishlist.data,
    availability_alerts: alerts.data,
    notifications: notifications.data,
    privacy_requests: dataRequests.data,
    contact_messages: messages.data,
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="guitarz4u-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

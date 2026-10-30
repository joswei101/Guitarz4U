import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Personal data export. Uses the customer's own session, so row-level
// security guarantees only their own records are included.
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const uid = user.id;
  const q = async (table: string, build: (b: ReturnType<typeof supabase.from>) => unknown) => {
    const { data } = await (build(supabase.from(table as never)) as Promise<{ data: unknown }>);
    return data ?? [];
  };
  const [profile, wishlist, reservations, enquiries, offers, messages, sellers, sellerOffers, repairs, quotes, worklog, reviews, notifications, alerts, payments, history] = await Promise.all([
    q('profiles', (b) => b.select('email, full_name, whatsapp, preferred_contact, notify_email, notify_stock_alerts, created_at').eq('id', uid)),
    q('wishlist_items', (b) => b.select('created_at, products(ref, brand, model)').eq('user_id', uid)),
    q('reservations', (b) => b.select('ref, status, contact_name, contact_email, contact_phone, message, price_at_reservation, expires_at, created_at, closed_at').eq('user_id', uid)),
    q('enquiries', (b) => b.select('ref, name, email, phone, preferred_contact, message, status, created_at, enquiry_items(product_label, price_at_enquiry)').eq('user_id', uid)),
    q('offers', (b) => b.select('ref, name, email, phone, amount, message, status, counter_amount, created_at').eq('user_id', uid)),
    q('messages', (b) => b.select('kind, name, email, phone, subject, body, status, created_at').eq('user_id', uid)),
    q('seller_enquiries', (b) => b.select('ref, name, email, whatsapp, brand, model, category, condition, faults, is_giveaway, asking_price, suburb, accessories, notes, status, created_at').eq('user_id', uid)),
    q('seller_offers', (b) => b.select('direction, amount, note, status, created_at, seller_enquiries!inner(ref, user_id)').eq('seller_enquiries.user_id', uid)),
    q('repairs', (b) => b.select('ref, name, email, whatsapp, brand, model, problem, services, preferred_date, status, completed_at, collected_at, warranty_days, created_at').eq('user_id', uid)),
    q('repair_quotes', (b) => b.select('kind, version, labour_amount, parts_amount, total_amount, parts_detail, notes, status, decision_method, decided_at, created_at, repairs!inner(ref, user_id)').eq('repairs.user_id', uid)),
    q('repair_work_log', (b) => b.select('entry, parts_used, created_at, repairs!inner(ref, user_id)').eq('repairs.user_id', uid).eq('visible_to_customer', true)),
    q('reviews', (b) => b.select('display_name, rating, title, body, related_to, status, created_at').eq('user_id', uid)),
    q('notifications', (b) => b.select('title, body, created_at, read_at').eq('user_id', uid)),
    q('stock_alerts', (b) => b.select('email, category, brand, max_price, keywords, is_active, created_at').eq('user_id', uid)),
    q('payments', (b) => b.select('entity_type, amount, method, received_on, created_at').eq('customer_id', uid)),
    q('status_history', (b) => b.select('entity_type, from_status, to_status, note, created_at').eq('customer_id', uid)),
  ]);
  const body = {
    exported_at: new Date().toISOString(),
    note: 'Personal data held by Guitarz4U for your account. See /legal/privacy for details.',
    account: { id: uid, email: user.email, created_at: user.created_at, sign_in_methods: user.app_metadata?.providers ?? [] },
    profile, wishlist, reservations, enquiries, offers, messages, seller_enquiries: sellers, seller_offers: sellerOffers,
    repairs, repair_quotes: quotes, repair_work_log: worklog, reviews, notifications, stock_alerts: alerts, payments, status_history: history,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="guitarz4u-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      'cache-control': 'no-store',
    },
  });
}

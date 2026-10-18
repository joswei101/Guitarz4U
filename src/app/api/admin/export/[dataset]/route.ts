import { getAdminOrNull } from "@/lib/session";
import { query } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { audit } from "@/lib/audit";

// CSV exports for record-keeping and backups. Admin only.
const DATASETS: Record<string, string> = {
  products: `select p.id, p.title, b.name brand, p.model, c.name category, p.price_cents/100.0 price_rand, p.compare_at_price_cents/100.0 was_price_rand, p.condition, p.status, p.featured, p.serial_number, p.is_demo, p.description, p.defects, p.history, p.created_at, p.published_at, p.sold_at
    from products p join categories c on c.id=p.category_id left join brands b on b.id=p.brand_id order by p.created_at`,
  "sold-products": `select p.id, p.title, b.name brand, p.model, p.price_cents/100.0 listed_price_rand, p.serial_number, p.sold_at,
      (select string_agg(r.reference || ' (' || coalesce(r.agreed_total_cents, r.estimated_total_cents)/100.0 || ')', '; ') from purchase_request_items i join purchase_requests r on r.id=i.purchase_request_id where i.product_id=p.id and r.status='completed') sale_references
    from products p left join brands b on b.id=p.brand_id where p.status='sold' order by p.sold_at`,
  "purchase-requests": `select r.reference, r.status, r.contact_name, r.contact_email, r.contact_phone, r.preferred_contact, r.message, r.estimated_total_cents/100.0 estimated_total_rand, r.agreed_total_cents/100.0 agreed_total_rand,
      r.eft_instructions_sent_at, r.payment_confirmed_at, r.completed_at, r.admin_notes, r.created_at,
      (select string_agg(i.title_snapshot || ' R' || i.price_cents_snapshot/100.0, '; ') from purchase_request_items i where i.purchase_request_id=r.id) items
    from purchase_requests r order by r.created_at`,
  reservations: `select r.reference, r.status, p.title product, r.contact_name, r.contact_email, r.contact_phone, r.message, r.expires_at, r.admin_notes, r.created_at from reservations r join products p on p.id=r.product_id order by r.created_at`,
  "seller-submissions": `select s.reference, s.status, s.seller_name, s.contact_phone, s.email, s.brand, s.model, c.name category, s.condition, s.works, s.faults, s.asking_price_cents/100.0 asking_rand, s.notes, s.admin_notes, s.created_at,
      (select string_agg('R' || o.amount_cents/100.0 || ' ' || o.status, '; ') from seller_offers o where o.submission_id=s.id) offers
    from seller_submissions s join categories c on c.id=s.category_id order by s.created_at`,
  repairs: `select r.reference, r.status, r.customer_name, r.contact_phone, r.email, r.guitar_brand, r.guitar_model, r.services, r.problem, r.preferred_date, r.confirmed_date, r.quote_amount_cents/100.0 quote_rand, r.quote_response, r.admin_notes, r.created_at from repair_bookings r order by r.created_at`,
  customers: `select u.id, u.name, u.email, u.role, u."emailVerified" email_verified, u."createdAt" created_at, u."deletedAt" deleted_at, p.phone, p.preferred_contact from "user" u left join customer_profiles p on p.user_id=u.id order by u."createdAt"`,
  reviews: `select r.display_name, r.rating, r.title, r.body, r.status, r.verified_purchase, r.created_at, r.moderated_at from reviews r order by r.created_at`,
  messages: `select m.kind, m.name, m.email, m.phone, m.subject, m.message, m.status, m.created_at from contact_messages m order by m.created_at`,
  "audit-log": `select id, actor_email, action, entity_type, entity_id, details, created_at from audit_logs order by id`,
};

export async function GET(_req: Request, ctx: { params: Promise<{ dataset: string }> }) {
  const admin = await getAdminOrNull();
  if (!admin) return new Response("Not found", { status: 404 });
  const { dataset } = await ctx.params;
  const sql = DATASETS[dataset];
  if (!sql) return new Response("Unknown dataset", { status: 404 });
  const rows = await query(sql);
  await audit(admin, "export.csv", "export", dataset, { rows: rows.length });
  return new Response("﻿" + toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="guitarz4u-${dataset}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}

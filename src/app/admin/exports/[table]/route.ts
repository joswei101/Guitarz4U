import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

/** CSV exports for the admin. Access is checked here AND enforced by RLS. */
const EXPORTS: Record<string, { table: string; columns: string; order: string }> = {
  products: { table: "products", columns: "id,slug,title,model,price,compare_at_price,condition,status,quantity,featured,is_demo,published_at,sold_at,created_at,updated_at,brand:brands(name),category:categories(name)", order: "created_at" },
  "sold-products": { table: "products", columns: "id,title,model,price,condition,sold_at,created_at,brand:brands(name),category:categories(name)", order: "sold_at" },
  "product-private": { table: "product_private", columns: "product_id,serial_number,acquisition_cost,acquired_from,internal_notes,updated_at", order: "updated_at" },
  "purchase-requests": { table: "purchase_requests", columns: "id,reference,contact_name,contact_email,contact_phone,preferred_contact,status,total_estimate,message,customer_message,created_at,updated_at", order: "created_at" },
  "purchase-request-items": { table: "purchase_request_items", columns: "id,request_id,product_id,title_snapshot,price_snapshot,quantity", order: "id" },
  reservations: { table: "reservations", columns: "id,reference,product_title_snapshot,price_snapshot,contact_name,contact_email,contact_phone,status,expires_at,decided_at,created_at", order: "created_at" },
  "seller-submissions": { table: "seller_submissions", columns: "id,reference,contact_name,contact_email,contact_phone,location,brand,model,condition,is_working,defects,asking_price,notes,status,created_at", order: "created_at" },
  "seller-offers": { table: "seller_offers", columns: "id,submission_id,amount,message,status,valid_until,responded_at,created_at", order: "created_at" },
  repairs: { table: "repair_bookings", columns: "id,reference,contact_name,contact_email,contact_phone,guitar_type,brand,model,requested_services,problem_description,status,quote_amount,quote_status,appointment_at,created_at", order: "created_at" },
  reviews: { table: "reviews", columns: "id,display_name,rating,title,body,status,verified_purchase,created_at", order: "created_at" },
  customers: { table: "profiles", columns: "id,full_name,email,phone,preferred_contact,role,created_at", order: "created_at" },
  messages: { table: "contact_messages", columns: "id,name,email,phone,subject,message,status,created_at", order: "created_at" },
  "audit-log": { table: "audit_logs", columns: "id,actor_email,action,table_name,record_id,changes,created_at", order: "created_at" },
};

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "object" ? (Array.isArray(v) ? v.join("; ") : ("name" in (v as object) ? String((v as { name: unknown }).name) : JSON.stringify(v))) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // prevent spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/admin/exports/[table]">) {
  const { table } = await ctx.params;
  const profile = await getProfile();
  if (profile?.role !== "admin") return new NextResponse("Not found", { status: 404 });
  const cfg = EXPORTS[table];
  if (!cfg) return new NextResponse("Unknown export", { status: 404 });
  const supabase = await createClient();
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(cfg.table as "products").select(cfg.columns).order(cfg.order as "created_at", { ascending: false }).range(from, from + 999);
    if (table === "sold-products") q = q.eq("status", "sold");
    const { data, error } = await q;
    if (error) return new NextResponse("Export failed", { status: 500 });
    rows.push(...((data ?? []) as unknown as Record<string, unknown>[]));
    if (!data || data.length < 1000) break;
  }
  const headers = rows.length ? Object.keys(rows[0]) : cfg.columns.split(",").map((c) => c.split(":")[0]);
  const csv = "﻿" + [headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="guitarz4u-${table}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

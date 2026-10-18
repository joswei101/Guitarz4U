import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminTitle } from "@/components/admin/AdminUi";
import { StatusBadge } from "@/components/ui/Badges";
import { formatDate, formatDateTime, formatRand } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata = { title: "Customer" };

export default async function AdminCustomer({ params }: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: c } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const [pr, rs, ss, rb, rv] = await Promise.all([
    supabase.from("purchase_requests").select("id, reference, status, total_estimate, created_at").eq("user_id", id).order("created_at", { ascending: false }),
    supabase.from("reservations").select("id, reference, status, product_title_snapshot, created_at").eq("user_id", id).order("created_at", { ascending: false }),
    supabase.from("seller_submissions").select("id, reference, status, brand, model, created_at").eq("user_id", id).order("created_at", { ascending: false }),
    supabase.from("repair_bookings").select("id, reference, status, brand, model, created_at").eq("user_id", id).order("created_at", { ascending: false }),
    supabase.from("reviews").select("id, rating, status, created_at").eq("user_id", id),
  ]);
  const block = (title: string, rows: { id: string; href: string; text: string; status: string; date: string }[]) => (
    <section className="card p-5">
      <h2 className="text-lg">{title} ({rows.length})</h2>
      <ul className="mt-2 divide-y divide-gold/20 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <Link href={r.href} className="link">{r.text}</Link>
            <span className="flex items-center gap-2"><StatusBadge status={r.status} /> <span className="text-xs text-tan">{formatDate(r.date)}</span></span>
          </li>
        ))}
        {!rows.length && <li className="py-2 text-tan">None</li>}
      </ul>
    </section>
  );
  return (
    <div className="space-y-6">
      <AdminTitle title={c.full_name || "(no name)"}>
        <Link href="/admin/customers" className="link">← Customers</Link> · Joined {formatDateTime(c.created_at)}
      </AdminTitle>
      <section className="card flex flex-wrap gap-6 p-5 text-sm">
        <p><span className="text-tan">Email:</span> <a className="link" href={`mailto:${c.email}`}>{c.email}</a></p>
        <p><span className="text-tan">Phone:</span> {c.phone ? <a className="link" href={whatsappLink(c.phone)} target="_blank" rel="noopener noreferrer">{c.phone} (WhatsApp)</a> : "—"}</p>
        <p><span className="text-tan">Prefers:</span> {c.preferred_contact}</p>
        <p><span className="text-tan">Role:</span> {c.role}</p>
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        {block("Purchase requests", (pr.data ?? []).map((r) => ({ id: r.id, href: `/admin/requests/${r.id}`, text: `${r.reference} · ${formatRand(r.total_estimate)}`, status: r.status, date: r.created_at })))}
        {block("Reservations", (rs.data ?? []).map((r) => ({ id: r.id, href: `/admin/reservations/${r.id}`, text: `${r.reference} · ${r.product_title_snapshot}`, status: r.status, date: r.created_at })))}
        {block("Seller submissions", (ss.data ?? []).map((r) => ({ id: r.id, href: `/admin/submissions/${r.id}`, text: `${r.reference} · ${r.brand} ${r.model}`, status: r.status, date: r.created_at })))}
        {block("Repairs", (rb.data ?? []).map((r) => ({ id: r.id, href: `/admin/repairs/${r.id}`, text: `${r.reference} · ${[r.brand, r.model].filter(Boolean).join(" ")}`, status: r.status, date: r.created_at })))}
        {block("Reviews", (rv.data ?? []).map((r) => ({ id: r.id, href: `/admin/reviews`, text: `${r.rating}★ review`, status: r.status, date: r.created_at })))}
      </div>
    </div>
  );
}

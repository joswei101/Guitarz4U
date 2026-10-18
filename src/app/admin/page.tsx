import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminTitle, Stat } from "@/components/admin/AdminUi";
import { Alert } from "@/components/ui/Alert";
import { formatRand, formatDateTime } from "@/lib/format";
import { isEmailConfigured } from "@/lib/email";
import { productStatusLabel } from "@/lib/constants";

export const metadata = { title: "Overview" };

type Overview = {
  inventory: Record<string, number> | null;
  open: Record<string, number>;
  events: Record<string, number>;
  top_products: { id: string; title: string; slug: string; status: string; views: number; enquiries: number }[];
  sold_in_period: number;
  sold_value_in_period: number;
  customers: number;
  new_customers_in_period: number;
};

export default async function AdminOverview({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const supabase = await createClient();
  const [{ data }, notes] = await Promise.all([
    supabase.rpc("admin_overview", { p_days: days }),
    supabase.from("notifications").select("id, title, body, link, created_at, read_at").eq("audience", "admin").order("created_at", { ascending: false }).limit(8),
  ]);
  const o = data as unknown as Overview;
  const inv = o?.inventory ?? {};
  const ev = o?.events ?? {};
  const views = ev.product_view ?? 0;
  const enquiries = (ev.purchase_request ?? 0) + (ev.reservation_request ?? 0);
  const conversion = views ? ((enquiries / views) * 100).toFixed(1) + "%" : "—";

  return (
    <div>
      <AdminTitle
        title="Overview"
        actions={
          <>
            <Link href="/admin/products/new" className="btn btn-primary">Add product</Link>
            <Link href="/" className="btn btn-outline">View website</Link>
          </>
        }
      >
        Everything that needs your attention, at a glance.
      </AdminTitle>

      {!isEmailConfigured() && (
        <Alert tone="info" className="mb-6" title="Email notifications are not configured">
          New requests appear here and in Notifications, but no emails are sent. Contact customers using the WhatsApp
          buttons on each record. See docs/SETUP.md → “Email notifications” to switch email on (free).
        </Alert>
      )}

      <h2 className="mb-3 text-xl">Needs action</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Stat label="Purchase requests" value={o?.open.purchase_requests ?? 0} href="/admin/requests?status=open" tone="gold" />
        <Stat label="Reservation requests" value={o?.open.reservations ?? 0} href="/admin/reservations?status=open" tone="gold" />
        <Stat label="Seller submissions" value={o?.open.seller_submissions ?? 0} href="/admin/submissions?status=open" tone="gold" />
        <Stat label="Repair requests" value={o?.open.repairs ?? 0} href="/admin/repairs?status=open" tone="gold" />
        <Stat label="Reviews to moderate" value={o?.open.reviews ?? 0} href="/admin/reviews" tone="gold" />
        <Stat label="New messages" value={o?.open.messages ?? 0} href="/admin/messages" tone="gold" />
        <Stat label="Privacy requests" value={o?.open.data_requests ?? 0} href="/admin/customers?tab=requests" tone="gold" />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl">Business snapshot</h2>
        <nav aria-label="Period" className="flex gap-1">
          {[7, 30, 90, 365].map((d) => (
            <Link key={d} href={`/admin?days=${d}`} className={`btn btn-sm ${d === days ? "btn-primary" : "btn-ghost"}`}>
              {d === 365 ? "1 year" : `${d} days`}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Available listings" value={inv.published ?? 0} href="/admin/products?status=published" />
        <Stat label="Reserved" value={inv.reserved ?? 0} href="/admin/products?status=reserved" />
        <Stat label="Drafts" value={inv.draft ?? 0} href="/admin/products?status=draft" />
        <Stat label="Sold (all time)" value={inv.sold ?? 0} href="/admin/products?status=sold" />
        <Stat label={`Sold in last ${days} days`} value={`${o?.sold_in_period ?? 0} · ${formatRand(o?.sold_value_in_period ?? 0)}`} />
        <Stat label="Customers" value={`${o?.customers ?? 0} (+${o?.new_customers_in_period ?? 0})`} href="/admin/customers" />
        <Stat label="Product views" value={views} />
        <Stat label="View → enquiry rate" value={conversion} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-xl">Activity ({days} days)</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {[
              ["Page views", ev.page_view],
              ["Product views", ev.product_view],
              ["Purchase requests (items)", ev.purchase_request],
              ["Reservation requests", ev.reservation_request],
              ["Seller submissions", ev.seller_submission],
              ["Repair bookings", ev.repair_booking],
              ["Wishlist adds", ev.wishlist_add],
              ["WhatsApp clicks", ev.whatsapp_click],
              ["Shares", ev.share],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between border-b border-gold/20 py-1">
                <dt>{k}</dt>
                <dd className="font-semibold">{(v as number) ?? 0}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-tan">First-party, cookie-free counts. Visitors with Do Not Track enabled are not counted.</p>
        </section>
        <section className="card p-5">
          <h2 className="text-xl">Most-viewed products</h2>
          {o?.top_products?.length ? (
            <table className="table-g4u mt-3">
              <thead>
                <tr><th>Product</th><th>Views</th><th>Enquiries</th></tr>
              </thead>
              <tbody>
                {o.top_products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/products/${p.id}`} className="link">{p.title}</Link>{" "}
                      <span className="text-xs text-tan">({productStatusLabel(p.status)})</span>
                    </td>
                    <td>{p.views}</td>
                    <td>{p.enquiries}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-3 text-sm text-tan">No product views recorded in this period yet.</p>
          )}
        </section>
      </div>

      <section className="card mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Latest notifications</h2>
          <Link href="/admin/notifications" className="link text-sm">All notifications</Link>
        </div>
        <ul className="mt-3 divide-y divide-gold/20">
          {(notes.data ?? []).map((n) => (
            <li key={n.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
              <Link href={n.link ?? "/admin/notifications"} className={`hover:underline ${n.read_at ? "" : "font-semibold"}`}>{n.title}</Link>
              <span className="text-xs text-tan">{formatDateTime(n.created_at)}</span>
            </li>
          ))}
          {!notes.data?.length && <li className="py-2 text-sm text-tan">Nothing yet.</li>}
        </ul>
      </section>
    </div>
  );
}

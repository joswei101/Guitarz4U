import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { formatDateTime, formatZAR } from "@/lib/format";
import { isEmailConfigured } from "@/lib/email";

export const metadata = { title: "Overview" };

const EVENT_LABELS: Record<string, string> = {
  product_view: "Product views",
  cart_add: "Added to request cart",
  wishlist_add: "Added to wishlist",
  purchase_request: "Purchase requests",
  reservation_request: "Reservation requests",
  seller_submission: "Seller submissions",
  repair_booking: "Repair bookings",
  enquiry: "Enquiries",
  whatsapp_click: "WhatsApp clicks",
  share: "Shares",
};

export default async function AdminOverview() {
  const supabase = await createClient();
  const [{ data: stats }, { data: recent }, { count: demoCount }] = await Promise.all([
    supabase.rpc("admin_dashboard_stats"),
    supabase.from("audit_logs").select("id, action, entity_type, actor_email, created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_demo", true),
  ]);
  const s = (stats ?? {}) as Record<string, unknown> & { events_30d?: Record<string, number>; top_products_30d?: { title: string; slug: string; views: number }[] };
  const n = (k: string) => Number(s[k] ?? 0);

  const actionCards = [
    { href: "/admin/requests?status=submitted", label: "New purchase requests to review", value: n("requests_open") },
    { href: "/admin/requests?status=awaiting_eft", label: "Approved — awaiting private EFT", value: n("requests_awaiting_eft") },
    { href: "/admin/requests?status=payment_confirmed", label: "Paid — arrange collection", value: n("requests_ready") },
    { href: "/admin/reservations?status=requested", label: "Reservation requests", value: n("reservations_pending") },
    { href: "/admin/submissions", label: "Seller submissions to review", value: n("submissions_open") },
    { href: "/admin/repairs", label: "Repair bookings to assess", value: n("repairs_open") },
    { href: "/admin/repairs?status=in_progress", label: "Active repairs", value: n("repairs_active") },
    { href: "/admin/reviews", label: "Reviews / reports to moderate", value: n("reviews_pending") + n("reports_open") },
    { href: "/admin/enquiries", label: "New enquiries", value: n("enquiries_new") },
    { href: "/admin/customers", label: "Privacy requests", value: n("data_requests_pending") },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Overview"
        description="Everything that needs your attention. Payments are never processed by the website — you confirm EFTs manually after checking your own bank account."
        actions={
          <Link href="/admin/products/new" className="btn btn-primary btn-sm">
            Add a product
          </Link>
        }
      />

      {(demoCount ?? 0) > 0 && (
        <p className="notice notice-strong text-sm">
          Your shop contains {demoCount} demonstration listing(s). Remove them before launch in{" "}
          <Link href="/admin/settings" className="font-semibold underline">
            Settings
          </Link>
          .
        </p>
      )}
      {!isEmailConfigured() && (
        <p className="notice text-sm">
          Email notifications are not configured, so you&apos;ll see new activity here and in Notifications only. See docs/SETUP.md to
          enable free SMTP email.
        </p>
      )}

      <section aria-labelledby="todo-heading">
        <h2 id="todo-heading" className="mb-3 text-xl">
          Needs attention
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {actionCards.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className={`card block h-full p-4 no-underline hover:shadow-[var(--shadow-lift)] ${c.value > 0 ? "border-gold" : ""}`}>
                <p className={`font-display text-3xl ${c.value > 0 ? "text-walnut" : "text-ink-soft"}`}>{c.value}</p>
                <p className="text-sm text-ink-soft">{c.label}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="card p-5">
          <h2 className="text-xl">Inventory</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            {[
              ["Available", n("products_published")],
              ["Reserved", n("products_reserved")],
              ["Drafts", n("products_draft")],
              ["Sold (archive)", n("products_sold")],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-lg bg-cream/60 p-3">
                <dt className="text-ink-soft">{k}</dt>
                <dd className="font-display text-2xl text-walnut">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-ink-soft">
            Completed sales (last 30 days): <strong className="text-walnut">{formatZAR(n("sales_completed_30d"))}</strong>
          </p>
          <p className="text-sm text-ink-soft">Registered customers: {n("customers")}</p>
        </div>

        <div className="card p-5">
          <h2 className="text-xl">Activity (last 30 days)</h2>
          <p className="mt-1 text-xs text-ink-soft">Anonymous first-party counts — no personal data, IP addresses or cookies.</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {Object.entries(EVENT_LABELS).map(([k, label]) => (
              <li key={k} className="flex justify-between gap-3">
                <span>{label}</span>
                <span className="font-semibold">{s.events_30d?.[k] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="text-xl">Most viewed guitars</h2>
          {s.top_products_30d?.length ? (
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
              {s.top_products_30d.map((p) => (
                <li key={p.slug}>
                  <Link href={`/shop/${p.slug}`} className="text-walnut hover:text-gold-ink">
                    {p.title}
                  </Link>{" "}
                  <span className="text-ink-soft">({p.views})</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">No product views recorded yet.</p>
          )}
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Recent administrator activity</h2>
          <Link href="/admin/audit" className="text-sm text-gold-ink">
            Full audit log
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-line text-sm">
          {((recent ?? []) as { id: number; action: string; entity_type: string; actor_email: string | null; created_at: string }[]).map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                <strong>{r.action}</strong> · {r.entity_type} {r.actor_email ? `· ${r.actor_email}` : "· system"}
              </span>
              <span className="text-ink-soft">{formatDateTime(r.created_at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

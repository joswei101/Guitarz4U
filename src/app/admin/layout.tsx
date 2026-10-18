import type { Metadata } from "next";
import { requireAdmin } from "@/lib/session";
import { query } from "@/lib/db";
import { expireOverdueReservations } from "@/lib/reservations";
import { SideNav } from "@/components/SideNav";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin(); // server-side role check for every admin page
  await expireOverdueReservations().catch((e) => console.error("[reservations]", e));
  const counts = Object.fromEntries(
    (await query<{ k: string; n: number }>(
      `select 'requests' k, count(*)::int n from purchase_requests where status in ('submitted','under_review')
       union all select 'reservations', count(*)::int from reservations where status='requested'
       union all select 'submissions', count(*)::int from seller_submissions where status in ('submitted','under_review','offer_accepted')
       union all select 'repairs', count(*)::int from repair_bookings where status in ('submitted','awaiting_review') or (status='quote_provided' and quote_response is not null)
       union all select 'reviews', count(*)::int from reviews where status='pending'
       union all select 'reports', count(*)::int from review_reports where resolved_at is null
       union all select 'messages', count(*)::int from contact_messages where status='new'
       union all select 'notifications', count(*)::int from notifications where audience='admin' and read_at is null
       union all select 'data', count(*)::int from data_requests where status='pending'`,
    )).map((r) => [r.k, r.n]),
  );
  return (
    <div className="wrap dash" style={{ maxWidth: 1400 }}>
      <SideNav
        title={`Admin · ${admin.name.split(" ")[0]}`}
        links={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/notifications", label: "Notifications", count: counts.notifications },
          { href: "/admin/products", label: "Inventory" },
          { href: "/admin/requests", label: "Purchase requests & EFT", count: counts.requests },
          { href: "/admin/reservations", label: "Reservations", count: counts.reservations },
          { href: "/admin/submissions", label: "Seller submissions & offers", count: counts.submissions },
          { href: "/admin/repairs", label: "Repairs", count: counts.repairs },
          { href: "/admin/messages", label: "Messages & questions", count: counts.messages },
          { href: "/admin/reviews", label: "Reviews", count: (counts.reviews ?? 0) + (counts.reports ?? 0) },
          { href: "/admin/customers", label: "Customers" },
          { href: "/admin/data-requests", label: "Privacy requests", count: counts.data },
          { href: "/admin/content", label: "Website content & settings" },
          { href: "/admin/exports", label: "Exports & backups" },
          { href: "/admin/audit", label: "Audit log" },
          { href: "/account", label: "→ My account" },
        ]}
        signOut
      />
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

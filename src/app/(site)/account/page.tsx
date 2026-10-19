import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountOverview({ searchParams }: { searchParams: Promise<{ verified?: string }> }) {
  const user = await requireUser();
  const { verified } = await searchParams;
  const supabase = await createClient();
  const count = (table: string, statuses?: string[]) => {
    let q = supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if (statuses) q = q.in("status", statuses);
    return q.then((r) => r.count ?? 0);
  };
  const [requests, reservations, selling, repairs, wishlist, notifications] = await Promise.all([
    count("purchase_requests", ["submitted", "under_review", "awaiting_customer", "approved", "awaiting_eft", "payment_confirmed", "ready_for_collection"]),
    count("reservations", ["requested", "approved"]),
    count("seller_submissions", ["submitted", "under_review", "more_info_requested", "offer_made", "offer_accepted", "approved"]),
    count("repair_bookings", ["submitted", "awaiting_review", "awaiting_info", "quote_provided", "approved", "in_progress", "awaiting_collection"]),
    supabase.from("wishlists").select("product_id", { count: "exact", head: true }).eq("user_id", user.id).then((r) => r.count ?? 0),
    supabase.from("notifications").select("id, title, body, link, read_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const tiles = [
    { href: "/account/requests", label: "Open purchase requests", value: requests },
    { href: "/account/reservations", label: "Active reservations", value: reservations },
    { href: "/account/selling", label: "Open seller submissions", value: selling },
    { href: "/account/repairs", label: "Open repairs", value: repairs },
    { href: "/account/wishlist", label: "Wishlist items", value: wishlist },
  ];
  const recent = (notifications.data ?? []) as { id: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string }[];

  return (
    <div className="space-y-8">
      {verified && (
        <p role="status" className="rounded-lg bg-success-bg p-4 text-success">
          Your email address has been verified. Welcome to Guitarz4U!
        </p>
      )}
      <div>
        <h1 className="text-3xl">My account</h1>
        <p className="mt-1 text-ink-soft">Track your requests and manage your details.</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="card block p-5 no-underline hover:shadow-[var(--shadow-lift)]">
              <p className="font-display text-3xl text-walnut">{t.value}</p>
              <p className="text-sm text-ink-soft">{t.label}</p>
            </Link>
          </li>
        ))}
      </ul>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/shop" className="btn btn-primary">
          Browse guitars
        </Link>
        <Link href="/sell" className="btn btn-outline">
          Sell a guitar
        </Link>
        <Link href="/repairs" className="btn btn-outline">
          Book a repair
        </Link>
      </div>
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Latest notifications</h2>
          <Link href="/account/notifications" className="text-sm text-gold-ink">
            View all
          </Link>
        </div>
        {recent.length ? (
          <ul className="mt-3 divide-y divide-line">
            {recent.map((n) => (
              <li key={n.id} className="py-3">
                <p className={`text-sm ${n.read_at ? "" : "font-semibold"}`}>
                  {n.link ? (
                    <Link href={n.link} className="text-walnut hover:text-gold-ink">
                      {n.title}
                    </Link>
                  ) : (
                    n.title
                  )}
                </p>
                <p className="text-xs text-ink-soft">{formatDateTime(n.created_at)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">No notifications yet.</p>
        )}
      </section>
    </div>
  );
}

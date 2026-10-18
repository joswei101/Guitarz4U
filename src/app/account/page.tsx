import Link from "next/link";
import { Bell, CalendarClock, Guitar, Heart, ShoppingBag, Wrench } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Overview" };

export default async function AccountOverview() {
  const { user } = await requireUser();
  const supabase = await createClient();
  const count = (table: "purchase_requests" | "reservations" | "seller_submissions" | "repair_bookings" | "wishlists") =>
    supabase.from(table).select("*", { count: "exact", head: true }).eq("user_id", user.id);
  const [pr, rs, ss, rb, wl, notes] = await Promise.all([
    count("purchase_requests"),
    count("reservations"),
    count("seller_submissions"),
    count("repair_bookings"),
    count("wishlists"),
    supabase.from("notifications").select("id, title, body, link, read_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
  ]);
  const tiles = [
    { href: "/account/requests", label: "Purchase requests", n: pr.count, icon: ShoppingBag },
    { href: "/account/reservations", label: "Reservations", n: rs.count, icon: CalendarClock },
    { href: "/account/submissions", label: "Guitars I'm selling", n: ss.count, icon: Guitar },
    { href: "/account/repairs", label: "Repairs", n: rb.count, icon: Wrench },
    { href: "/account/wishlist", label: "Wishlist", n: wl.count, icon: Heart },
  ];
  return (
    <div className="space-y-8">
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map(({ icon: Icon, ...t }) => (
          <li key={t.href}>
            <Link href={t.href} className="card flex h-full flex-col p-4 hover:border-gold">
              <Icon className="h-5 w-5 text-gold" aria-hidden />
              <span className="mt-2 font-display text-3xl">{t.n ?? 0}</span>
              <span className="text-sm">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <section aria-labelledby="latest-h" className="card p-5">
        <div className="flex items-center justify-between">
          <h2 id="latest-h" className="flex items-center gap-2 text-xl">
            <Bell className="h-5 w-5 text-gold" aria-hidden /> Latest updates
          </h2>
          <Link href="/account/notifications" className="link text-sm">
            All notifications
          </Link>
        </div>
        {notes.data?.length ? (
          <ul className="mt-4 divide-y divide-gold/20">
            {notes.data.map((n) => (
              <li key={n.id} className="py-3">
                <Link href={n.link ?? "/account/notifications"} className="block hover:underline">
                  <span className={n.read_at ? "" : "font-semibold"}>{n.title}</span>
                </Link>
                <p className="text-xs text-tan">{formatDateTime(n.created_at)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-tan">No updates yet. When you send a request we&apos;ll post updates here.</p>
        )}
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/shop" className="btn btn-primary">Browse the shop</Link>
        <Link href="/sell" className="btn btn-outline">Sell a guitar</Link>
        <Link href="/repairs#book" className="btn btn-outline">Book a repair</Link>
      </section>
    </div>
  );
}

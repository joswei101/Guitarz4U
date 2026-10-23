import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoMark } from "@/components/layout/Logo";
import { AdminNav } from "@/components/admin/AdminNav";
import { signOutAction } from "@/app/(site)/(auth)/actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Guitarz4U admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireAdmin();
  const supabase = await createClient();
  // Lazily expire reservations whose hold period has ended.
  await supabase.rpc("expire_reservations");
  const { data: stats } = await supabase.rpc("admin_dashboard_stats");
  const { count: unread } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);
  const s = (stats ?? {}) as Record<string, number>;

  const badges: Record<string, number> = {
    "/admin/requests": (s.requests_open ?? 0) + (s.requests_awaiting_eft ?? 0),
    "/admin/reservations": s.reservations_pending ?? 0,
    "/admin/submissions": s.submissions_open ?? 0,
    "/admin/repairs": s.repairs_open ?? 0,
    "/admin/reviews": (s.reviews_pending ?? 0) + (s.reports_open ?? 0),
    "/admin/enquiries": s.enquiries_new ?? 0,
    "/admin/customers": s.data_requests_pending ?? 0,
    "/admin/notifications": unread ?? 0,
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream/40 lg:flex-row">
      <a href="#admin-main" className="skip-link">
        Skip to content
      </a>
      <aside className="on-dark bg-deep text-cream lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3 p-4">
          <Link href="/admin" className="flex items-center gap-2 no-underline">
            <LogoMark className="h-9 w-9" />
            <span className="font-display text-lg text-cream-light">
              Guitarz<span className="text-gold-light">4U</span> <span className="text-xs uppercase tracking-widest text-gold">Admin</span>
            </span>
          </Link>
        </div>
        <AdminNav badges={badges} />
        <div className="space-y-2 border-t border-white/10 p-4 text-sm">
          <p className="truncate text-cream/70">{profile.email}</p>
          <div className="flex gap-2">
            <Link href="/" className="btn btn-outline-light btn-sm flex-1">
              View site
            </Link>
            <form action={signOutAction} className="flex-1">
              <button type="submit" className="btn btn-outline-light btn-sm w-full">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main id="admin-main" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}

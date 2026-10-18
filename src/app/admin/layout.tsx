import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin | Guitarz4U" },
  robots: { index: false, follow: false },
};

/** Every admin page is protected here AND by Row-Level Security in the database. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.rpc("expire_stale_records");
  const { data } = await supabase.rpc("admin_overview", { p_days: 30 });
  const counts = ((data as { open?: Record<string, number> } | null)?.open ?? {}) as Record<string, number>;
  return (
    <div className="bg-cream">
      <div className="mx-auto grid max-w-[1400px] gap-0 lg:grid-cols-[240px_1fr]">
        <aside className="bg-espresso px-3 py-4 lg:min-h-[calc(100vh-72px)] lg:py-6">
          <p className="mb-3 hidden px-3 text-xs uppercase tracking-widest text-gold-light lg:block">Owner dashboard</p>
          <AdminNav counts={counts} />
        </aside>
        <div className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}

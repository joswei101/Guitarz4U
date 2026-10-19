import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { getBrands, getCategories } from "@/lib/data/products";
import { EmptyState } from "@/components/ui/EmptyState";
import { NewArrivalAlertButton } from "@/components/shop/AlertButtons";
import { deleteAlertAction } from "@/app/(site)/account/actions";

export const metadata: Metadata = { title: "Availability alerts", robots: { index: false } };

export default async function AlertsPage() {
  const user = await requireUser("/account/alerts");
  const supabase = await createClient();
  const [{ data }, categories, brands] = await Promise.all([
    supabase
      .from("availability_alerts")
      .select("id, is_active, created_at, last_notified_at, product:products(title, slug), category_id, brand_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    getCategories(),
    getBrands(),
  ]);
  const alerts = (data ?? []) as unknown as {
    id: string; is_active: boolean; created_at: string; last_notified_at: string | null;
    product: { title: string; slug: string } | null; category_id: number | null; brand_id: number | null;
  }[];

  const describe = (a: (typeof alerts)[number]) => {
    if (a.product) return `When "${a.product.title}" becomes available`;
    const parts = [brands.find((b) => b.id === a.brand_id)?.name, categories.find((c) => c.id === a.category_id)?.name].filter(Boolean);
    return `New arrivals: ${parts.join(" ") || "any guitar"}`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Availability alerts</h1>
      <p className="text-sm text-ink-soft">
        We&apos;ll send you an in-app notification when a matching guitar is listed or a reserved guitar becomes available again.
        Alerts never guarantee availability.
      </p>
      {alerts.length ? (
        <ul className="space-y-3">
          {alerts.map((a) => (
            <li key={a.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-walnut">
                  {a.product ? <Link href={`/shop/${a.product.slug}`}>{describe(a)}</Link> : describe(a)}
                </p>
                <p className="text-xs text-ink-soft">
                  Created {formatDate(a.created_at)}
                  {a.last_notified_at ? ` · last notified ${formatDate(a.last_notified_at)}` : ""}
                  {!a.is_active ? " · completed" : ""}
                </p>
              </div>
              <form action={deleteAlertAction}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="btn btn-outline btn-sm">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No alerts yet">
          <p>Create an alert below, or from any shop page.</p>
        </EmptyState>
      )}
      <NewArrivalAlertButton label="any guitar" />
    </div>
  );
}

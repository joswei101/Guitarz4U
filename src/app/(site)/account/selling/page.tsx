import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { SELLER_STATUS_LABELS, type SellerStatus } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "My seller submissions", robots: { index: false } };

export default async function SellingPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("seller_submissions")
    .select("id, reference, brand, model, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as { id: string; reference: string; brand: string; model: string; status: SellerStatus; created_at: string }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Selling to Guitarz4U</h1>
        <Link href="/sell" className="btn btn-primary btn-sm">
          New submission
        </Link>
      </div>
      <p className="text-sm text-ink-soft">Track the guitars you&apos;ve offered to us. Submitting a guitar is not an agreement to buy it.</p>
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/account/selling/${r.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-5 no-underline hover:shadow-[var(--shadow-lift)]">
                <div>
                  <p className="font-semibold text-walnut">
                    {r.brand} {r.model}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {r.reference} · submitted {formatDate(r.created_at)}
                  </p>
                </div>
                <StatusBadge status={r.status} label={SELLER_STATUS_LABELS[r.status]} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No submissions yet" action={{ href: "/sell", label: "Sell your guitar" }} />
      )}
    </div>
  );
}

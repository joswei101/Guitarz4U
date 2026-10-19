import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatZAR } from "@/lib/format";
import { PURCHASE_STATUS_LABELS, type PurchaseStatus } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "My purchase requests", robots: { index: false } };

export default async function RequestsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchase_requests")
    .select("id, reference, status, estimated_total, created_at, items:purchase_request_items(title_snapshot)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as { id: string; reference: string; status: PurchaseStatus; estimated_total: number; created_at: string; items: { title_snapshot: string }[] }[];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Purchase requests</h1>
      <p className="notice text-sm">
        A purchase request is not a confirmed purchase. Please don&apos;t pay until Guitarz4U has approved your request and sent EFT
        details to you privately.
      </p>
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/account/requests/${r.id}`} className="card flex flex-col gap-2 p-5 no-underline hover:shadow-[var(--shadow-lift)] sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-walnut">{r.reference}</p>
                  <p className="truncate text-sm text-ink-soft">{r.items.map((i) => i.title_snapshot).join(", ")}</p>
                  <p className="text-xs text-ink-soft">Submitted {formatDate(r.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <StatusBadge status={r.status} label={PURCHASE_STATUS_LABELS[r.status]} />
                  <span className="text-sm text-ink-soft">Est. {formatZAR(r.estimated_total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No purchase requests yet" action={{ href: "/shop", label: "Browse guitars" }} />
      )}
    </div>
  );
}

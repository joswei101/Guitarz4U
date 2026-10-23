import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { REPAIR_STATUS_LABELS, type RepairStatus } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "My repairs", robots: { index: false } };

export default async function RepairsListPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("repair_bookings")
    .select("id, reference, guitar_brand, guitar_model, status, created_at, quote_amount, customer_quote_response")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as { id: string; reference: string; guitar_brand: string; guitar_model: string; status: RepairStatus; created_at: string; quote_amount: number | null; customer_quote_response: string | null }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Repairs</h1>
        <Link href="/repairs#book" className="btn btn-primary btn-sm">
          Book a repair
        </Link>
      </div>
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/account/repairs/${r.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-5 no-underline hover:shadow-[var(--shadow-lift)]">
                <div>
                  <p className="font-semibold text-walnut">
                    {r.guitar_brand} {r.guitar_model}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {r.reference} · booked {formatDate(r.created_at)}
                  </p>
                  {r.status === "quote_provided" && !r.customer_quote_response && (
                    <p className="mt-1 text-sm font-semibold text-warning">A quote is waiting for your response</p>
                  )}
                </div>
                <StatusBadge status={r.status} label={REPAIR_STATUS_LABELS[r.status]} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No repair bookings yet" action={{ href: "/repairs", label: "Book a repair" }} />
      )}
    </div>
  );
}

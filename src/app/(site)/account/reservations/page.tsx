import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/format";
import { RESERVATION_STATUS_LABELS, type ReservationStatus } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusTimeline } from "@/components/account/StatusTimeline";
import { ConfirmActionForm } from "@/components/account/ConfirmActionForm";
import { cancelReservationAction } from "@/app/(site)/account/actions";

export const metadata: Metadata = { title: "My reservations", robots: { index: false } };

export default async function ReservationsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("reservations")
    .select("id, reference, status, product_title_snapshot, created_at, expires_at, product:products(slug, status)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as {
    id: string; reference: string; status: ReservationStatus; product_title_snapshot: string; created_at: string; expires_at: string | null;
    product: { slug: string; status: string } | null;
  }[];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Reservations</h1>
      <p className="notice text-sm">A reservation request is not confirmed until Guitarz4U approves it. Approved reservations expire at the end of the hold period.</p>
      {rows.length ? (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-walnut">
                    {r.product && ["published", "reserved"].includes(r.product.status) ? (
                      <Link href={`/shop/${r.product.slug}`} className="hover:text-gold-ink">
                        {r.product_title_snapshot}
                      </Link>
                    ) : (
                      r.product_title_snapshot
                    )}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {r.reference} · requested {formatDate(r.created_at)}
                    {r.status === "approved" && r.expires_at ? ` · held until ${formatDateTime(r.expires_at)}` : ""}
                  </p>
                </div>
                <StatusBadge status={r.status} label={RESERVATION_STATUS_LABELS[r.status]} />
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-gold-ink">Status history</summary>
                <div className="mt-3">
                  <StatusTimeline entityType="reservation" entityId={r.id} labels={{ ...RESERVATION_STATUS_LABELS, requested: "Requested" }} />
                </div>
              </details>
              {(r.status === "requested" || r.status === "approved") && (
                <div className="mt-3">
                  <ConfirmActionForm action={cancelReservationAction} hidden={{ id: r.id }} label="Cancel reservation" confirmText="Cancel this reservation?" />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No reservations" action={{ href: "/shop", label: "Browse guitars" }}>
          <p>You can request a reservation from any available guitar&apos;s page.</p>
        </EmptyState>
      )}
    </div>
  );
}

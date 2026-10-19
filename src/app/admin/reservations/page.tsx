import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, ContactLinks, StatusFilter } from "@/components/admin/AdminUI";
import { StatusUpdateForm } from "@/components/admin/AdminForms";
import { StatusBadge } from "@/components/ui/Badge";
import { setReservationStatusAction } from "@/app/admin/actions";
import { isEmailConfigured } from "@/lib/email";
import { getSiteSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/format";
import { CONTACT_METHOD_LABELS, PRODUCT_STATUS_LABELS, RESERVATION_STATUS_LABELS, type ContactMethod, type ProductStatus, type ReservationStatus } from "@/lib/constants";

export const metadata = { title: "Reservations" };

const NEXT: Record<ReservationStatus, ReservationStatus[]> = {
  requested: ["approved", "declined", "cancelled"],
  approved: ["fulfilled", "cancelled", "expired"],
  declined: [],
  cancelled: [],
  expired: [],
  fulfilled: [],
};

export default async function AdminReservations({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const settings = await getSiteSettings();
  let query = supabase
    .from("reservations")
    .select("*, product:products(id, slug, status)")
    .order("created_at", { ascending: false })
    .limit(200);
  query = status && status in RESERVATION_STATUS_LABELS ? query.eq("status", status) : query.in("status", ["requested", "approved"]);
  const { data } = await query;
  const rows = (data ?? []) as unknown as {
    id: string; reference: string; status: ReservationStatus; product_title_snapshot: string; contact_name: string; contact_email: string | null;
    contact_phone: string | null; preferred_contact: ContactMethod; customer_message: string; created_at: string; expires_at: string | null; approved_at: string | null;
    product: { id: string; slug: string; status: ProductStatus } | null;
  }[];
  const email = isEmailConfigured();

  return (
    <div>
      <AdminPageHeader
        title="Reservations"
        description={`Approve or decline reservation requests. Approving reserves the guitar for the hold period (default ${settings.reservations.hold_days} days, change in Settings); expired holds are released automatically. Only one reservation can be approved per guitar.`}
      />
      <StatusFilter base="/admin/reservations" current={status} options={Object.entries(RESERVATION_STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
      {rows.length ? (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="card grid gap-5 p-5 lg:grid-cols-[1fr_22rem]">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg">{r.product_title_snapshot}</h2>
                  <StatusBadge status={r.status} label={RESERVATION_STATUS_LABELS[r.status]} />
                </div>
                <p className="text-sm text-ink-soft">
                  {r.reference} · requested {formatDateTime(r.created_at)}
                  {r.status === "approved" && r.expires_at && ` · held until ${formatDateTime(r.expires_at)}`}
                </p>
                <p className="text-sm">
                  Product:{" "}
                  {r.product ? (
                    <Link href={`/admin/products/${r.product.id}`} className="text-walnut hover:text-gold-ink">
                      {PRODUCT_STATUS_LABELS[r.product.status]}
                    </Link>
                  ) : (
                    "removed"
                  )}
                </p>
                <p className="text-sm">
                  <strong>{r.contact_name}</strong> · {r.contact_phone ?? "no phone"} · {r.contact_email ?? "no email"} · prefers {CONTACT_METHOD_LABELS[r.preferred_contact]}
                </p>
                {r.customer_message && <p className="rounded-lg bg-cream/60 p-3 text-sm">{r.customer_message}</p>}
                <ContactLinks name={r.contact_name} phone={r.contact_phone} email={r.contact_email} context={`your reservation ${r.reference}`} />
              </div>
              <div>
                {NEXT[r.status].length ? (
                  <StatusUpdateForm
                    action={setReservationStatusAction}
                    id={r.id}
                    current={NEXT[r.status][0]}
                    options={NEXT[r.status].map((s) => ({ value: s, label: s === "approved" ? "Approve reservation" : RESERVATION_STATUS_LABELS[s] }))}
                    extraHidden={{ hold_days: String(settings.reservations.hold_days) }}
                    emailAvailable={email}
                    submitLabel="Save"
                  />
                ) : (
                  <p className="text-sm text-ink-soft">Closed.</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card p-8 text-center text-ink-soft">No reservations here.</p>
      )}
    </div>
  );
}

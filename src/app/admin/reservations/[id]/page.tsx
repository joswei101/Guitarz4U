import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStatusEvents } from "@/lib/data/account";
import { getSettings } from "@/lib/settings";
import { AdminTitle } from "@/components/admin/AdminUi";
import { ContactCard } from "@/components/admin/ContactCard";
import { AdminNotes } from "@/components/admin/AdminNotes";
import { ReservationDecision } from "@/components/admin/ReservationDecision";
import { Timeline } from "@/components/ui/Timeline";
import { AvailabilityBadge, StatusBadge } from "@/components/ui/Badges";
import { Alert } from "@/components/ui/Alert";
import { RESERVATION_STATUSES, statusLabel } from "@/lib/constants";
import { formatDateTime, formatRand } from "@/lib/format";
import { SITE_URL } from "@/lib/env";

export const metadata = { title: "Reservation" };

export default async function AdminReservation({ params }: PageProps<"/admin/reservations/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: r } = await supabase.from("reservations").select("*, product:products(id, slug, title, status, quantity)").eq("id", id).maybeSingle();
  if (!r) notFound();
  const [events, settings] = await Promise.all([getStatusEvents("reservation", id), getSettings()]);
  const label = (s: string) => statusLabel(RESERVATION_STATUSES, s);
  let others: { id: string; reference: string; contact_name: string; status: string }[] = [];
  if (r.product_id) {
    const { data } = await supabase.from("reservations").select("id, reference, contact_name, status").eq("product_id", r.product_id).neq("id", r.id).in("status", ["requested", "approved"]);
    others = data ?? [];
  }
  return (
    <div>
      <AdminTitle title={`Reservation ${r.reference}`} actions={<StatusBadge status={r.status} label={label(r.status)} />}>
        <Link href="/admin/reservations" className="link">← All reservations</Link> · Requested {formatDateTime(r.created_at)}
      </AdminTitle>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-lg">Item</h2>
            <p className="mt-2">
              {r.product ? <Link href={`/admin/products/${r.product.id}`} className="link font-semibold">{r.product_title_snapshot}</Link> : `${r.product_title_snapshot} (deleted)`}{" "}
              — {formatRand(r.price_snapshot)} {r.product && <AvailabilityBadge status={r.product.status} quantity={r.product.quantity} />}
            </p>
            {r.status === "approved" && r.expires_at && <p className="mt-2 text-sm">Held until <strong>{formatDateTime(r.expires_at)}</strong>. Expired holds are released automatically.</p>}
            {r.message && <p className="mt-3 whitespace-pre-line rounded bg-cream-2 p-3 text-sm"><strong>Customer message:</strong> {r.message}</p>}
            {others.length > 0 && (
              <Alert tone="warning" className="mt-4" title="Other open reservations for this item">
                {others.map((o) => (
                  <span key={o.id} className="block"><Link href={`/admin/reservations/${o.id}`} className="link">{o.reference}</Link> — {o.contact_name} ({o.status})</span>
                ))}
              </Alert>
            )}
          </section>
          <section className="card p-5">
            <h2 className="mb-4 text-lg">Decision</h2>
            <ReservationDecision id={r.id} status={r.status} holdDays={settings.reservation_hold_days} productAvailable={r.product?.status === "published"} />
          </section>
          <section className="card p-5">
            <h2 className="mb-4 text-lg">Timeline</h2>
            <Timeline events={events} label={label} />
          </section>
        </div>
        <div className="space-y-6">
          <ContactCard
            name={r.contact_name}
            phone={r.contact_phone}
            email={r.contact_email}
            preferred={r.preferred_contact}
            userId={r.user_id}
            waMessage={`Hi ${r.contact_name.split(" ")[0]}, this is Guitarz4U about your reservation request ${r.reference} for "${r.product_title_snapshot}". ${SITE_URL}/account/reservations/${r.id}`}
          />
          <AdminNotes entityType="reservation" entityId={r.id} />
        </div>
      </div>
    </div>
  );
}

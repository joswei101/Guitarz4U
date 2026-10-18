import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStatusEvents } from "@/lib/data/account";
import { Alert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badges";
import { Timeline } from "@/components/ui/Timeline";
import { ActionButton } from "@/components/account/ActionButton";
import { cancelReservation } from "@/app/actions/account";
import { RESERVATION_STATUSES, statusLabel } from "@/lib/constants";
import { formatDateTime, formatRand } from "@/lib/format";

export const metadata = { title: "Reservation" };

export default async function ReservationDetail({ params, searchParams }: PageProps<"/account/reservations/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  await requireUser(`/account/reservations/${id}`);
  const supabase = await createClient();
  const { data: r } = await supabase.from("reservations").select("*, product:products(slug)").eq("id", id).maybeSingle();
  if (!r) notFound();
  const events = await getStatusEvents("reservation", id);
  const label = (s: string) => statusLabel(RESERVATION_STATUSES, s);
  return (
    <div className="space-y-6">
      {sp.submitted && (
        <Alert tone="success" title="Reservation request sent">
          This is a request, not a confirmed reservation. Guitarz4U will review it and contact you. No payment has been taken.
        </Alert>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/account/reservations" className="link text-sm">← All reservations</Link>
          <h2 className="mt-1 text-2xl">Reservation {r.reference}</h2>
          <p className="text-sm text-tan">Requested {formatDateTime(r.created_at)}</p>
        </div>
        <StatusBadge status={r.status} label={label(r.status)} />
      </div>
      {r.status === "requested" && (
        <Alert tone="warning">Not yet confirmed — waiting for Guitarz4U to review your request.</Alert>
      )}
      {r.status === "approved" && r.expires_at && (
        <Alert tone="success" title="Reservation approved">
          The item is held for you until {formatDateTime(r.expires_at)}. Please arrange payment with us before then.
        </Alert>
      )}
      {r.customer_message && (
        <Alert tone="info" title="Message from Guitarz4U">
          <p className="whitespace-pre-line">{r.customer_message}</p>
        </Alert>
      )}
      <section className="card p-5">
        <p className="font-display text-lg">
          {r.product?.slug ? <Link href={`/shop/${r.product.slug}`} className="link">{r.product_title_snapshot}</Link> : r.product_title_snapshot}
        </p>
        <p className="font-semibold">{formatRand(r.price_snapshot)}</p>
        {r.message && <p className="mt-3 whitespace-pre-line text-sm"><strong>Your message:</strong> {r.message}</p>}
      </section>
      <section className="card p-5">
        <h3 className="mb-4 text-lg">Progress</h3>
        <Timeline events={events} label={label} />
      </section>
      {["requested", "approved"].includes(r.status) && (
        <ActionButton action={cancelReservation.bind(null, r.id)} confirm="Cancel this reservation?" className="btn btn-outline text-danger">
          Cancel reservation
        </ActionButton>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUploadUrls } from "@/lib/storage";
import { formatDate, formatDateTime, formatZAR } from "@/lib/format";
import { REPAIR_SERVICES, REPAIR_STATUS_LABELS, type RepairStatus } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/Badge";
import { StatusTimeline } from "@/components/account/StatusTimeline";
import { ConfirmActionForm } from "@/components/account/ConfirmActionForm";
import { PhotoGrid } from "@/components/account/PhotoGrid";
import { cancelRepairAction, respondQuoteAction } from "@/app/(site)/account/actions";

export const metadata: Metadata = { title: "Repair booking", robots: { index: false } };

export default async function RepairDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/account/repairs/${id}`);
  const supabase = await createClient();
  const { data } = await supabase
    .from("repair_bookings")
    .select("*, images:repair_images(storage_path)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) notFound();
  const b = data as unknown as {
    id: string; reference: string; status: RepairStatus; guitar_brand: string; guitar_model: string; services: string[];
    problem_description: string; preferred_date: string | null; notes: string; created_at: string;
    quote_amount: number | null; quote_message: string | null; quote_provided_at: string | null;
    customer_quote_response: "accepted" | "declined" | null; customer_quote_response_at: string | null;
    images: { storage_path: string }[];
  };
  const photos = await signedUploadUrls(b.images.map((i) => i.storage_path));
  const serviceNames = b.services.map((s) => REPAIR_SERVICES.find((r) => r.id === s)?.name ?? s);
  const awaitingResponse = b.status === "quote_provided" && !b.customer_quote_response;

  return (
    <div className="space-y-6">
      <Link href="/account/repairs" className="text-sm text-gold-ink">
        ← All repairs
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">
          {b.guitar_brand} {b.guitar_model}
        </h1>
        <StatusBadge status={b.status} label={REPAIR_STATUS_LABELS[b.status]} />
      </div>
      <p className="text-sm text-ink-soft">Reference {b.reference} · booked {formatDateTime(b.created_at)}</p>

      {b.quote_amount !== null && (
        <section className={`card p-5 ${awaitingResponse ? "border-gold" : ""}`}>
          <h2 className="text-xl">Quote: {formatZAR(b.quote_amount)}</h2>
          {b.quote_message && <p className="mt-2 whitespace-pre-line text-sm">{b.quote_message}</p>}
          <p className="mt-2 text-xs text-ink-soft">Provided {formatDateTime(b.quote_provided_at)}. Payment, if any, is arranged privately — never through this website.</p>
          {awaitingResponse ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <ConfirmActionForm action={respondQuoteAction} hidden={{ id: b.id, decision: "accept" }} label="Accept quote" className="btn btn-primary btn-sm" confirmText="Accept this quote?" />
              <ConfirmActionForm action={respondQuoteAction} hidden={{ id: b.id, decision: "decline" }} label="Decline quote" confirmText="Decline this quote?" />
            </div>
          ) : (
            b.customer_quote_response && (
              <p className="mt-3 text-sm font-semibold">
                You {b.customer_quote_response} this quote on {formatDate(b.customer_quote_response_at)}.
                {b.customer_quote_response === "accepted" && b.status === "quote_provided" && " Guitarz4U will confirm your booking."}
              </p>
            )
          )}
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card space-y-4 p-5">
          <h2 className="text-xl">Booking details</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-ink-soft">Work requested</dt><dd className="text-right">{serviceNames.join(", ")}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-soft">Preferred date</dt><dd>{b.preferred_date ? formatDate(b.preferred_date) : "Flexible"}</dd></div>
          </dl>
          <div className="text-sm">
            <p className="font-semibold">Problem</p>
            <p className="whitespace-pre-line text-ink-soft">{b.problem_description}</p>
          </div>
          {b.notes && (
            <div className="text-sm">
              <p className="font-semibold">Notes</p>
              <p className="whitespace-pre-line text-ink-soft">{b.notes}</p>
            </div>
          )}
          <PhotoGrid photos={photos} />
          <p className="text-xs text-ink-soft">Your preferred date is a request only. Appointments are confirmed personally by Guitarz4U.</p>
          {["submitted", "awaiting_review", "awaiting_info", "quote_provided", "approved"].includes(b.status) && (
            <div className="border-t border-line pt-4">
              <ConfirmActionForm action={cancelRepairAction} hidden={{ id: b.id }} label="Cancel booking" confirmText="Cancel this repair booking?" />
            </div>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-4 text-xl">Status updates</h2>
          <StatusTimeline entityType="repair_booking" entityId={b.id} labels={REPAIR_STATUS_LABELS} />
        </section>
      </div>
    </div>
  );
}

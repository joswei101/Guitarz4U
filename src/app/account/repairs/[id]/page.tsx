import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStatusEvents, signedUrls } from "@/lib/data/account";
import { Alert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badges";
import { Timeline } from "@/components/ui/Timeline";
import { PhotoGrid } from "@/components/ui/PhotoGrid";
import { ActionButton, ReplyBox } from "@/components/account/ActionButton";
import { AddPhotos } from "@/components/account/AddPhotos";
import { cancelRepair, replyToRepair, respondToQuote } from "@/app/actions/account";
import { GUITAR_TYPES, REPAIR_STATUSES, repairServiceLabel, statusLabel } from "@/lib/constants";
import { formatDate, formatDateTime, formatRand } from "@/lib/format";

export const metadata = { title: "Repair booking" };

export default async function RepairDetail({ params, searchParams }: PageProps<"/account/repairs/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { user } = await requireUser(`/account/repairs/${id}`);
  const supabase = await createClient();
  const { data: r } = await supabase.from("repair_bookings").select("*, images:repair_images(storage_path)").eq("id", id).maybeSingle();
  if (!r) notFound();
  const [events, urls] = await Promise.all([getStatusEvents("repair_booking", id), signedUrls("repair-images", r.images.map((i) => i.storage_path))]);
  const label = (s: string) => statusLabel(REPAIR_STATUSES, s);
  const isOwner = r.user_id === user.id;
  const open = ["submitted", "awaiting_review", "awaiting_customer"].includes(r.status);

  return (
    <div className="space-y-6">
      {sp.submitted && (
        <Alert tone="success" title="Repair request sent">
          We&apos;ll review it and get back to you with the next steps or a quotation. Nothing is booked or started until we confirm with you.
          {sp.photoErrors && " Some photos could not be uploaded — you can add them again below."}
        </Alert>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/account/repairs" className="link text-sm">← All repairs</Link>
          <h2 className="mt-1 text-2xl">Repair {r.reference}</h2>
          <p className="text-sm text-tan">Requested {formatDateTime(r.created_at)}</p>
        </div>
        <StatusBadge status={r.status} label={label(r.status)} />
      </div>

      {r.quote_amount !== null && (
        <section className="card border-gold p-5">
          <h3 className="text-xl">Quotation: {formatRand(r.quote_amount)}</h3>
          {r.quote_message && <p className="mt-2 whitespace-pre-line">{r.quote_message}</p>}
          <p className="mt-2 text-sm">
            Quote status: <StatusBadge status={r.quote_status} label={{ none: "—", pending: "Awaiting your response", accepted: "Accepted", declined: "Declined" }[r.quote_status]} />
          </p>
          {r.quote_status === "pending" && isOwner && (
            <div className="mt-4 flex flex-wrap gap-3">
              <ActionButton action={respondToQuote.bind(null, r.id, true)} confirm={`Accept the quote of ${formatRand(r.quote_amount)}?`} className="btn btn-primary">
                Accept quote
              </ActionButton>
              <ActionButton action={respondToQuote.bind(null, r.id, false)} confirm="Decline this quote?" className="btn btn-outline">
                Decline quote
              </ActionButton>
            </div>
          )}
          {r.quote_status === "accepted" && !["approved", "in_progress", "awaiting_collection", "completed"].includes(r.status) && (
            <p className="mt-3 text-sm">Thanks! Guitarz4U will confirm the next steps with you before any work starts.</p>
          )}
        </section>
      )}

      {r.appointment_at && (
        <Alert tone="success" title="Confirmed appointment">{formatDateTime(r.appointment_at)}</Alert>
      )}
      {r.customer_message && (
        <Alert tone="info" title="Message from Guitarz4U">
          <p className="whitespace-pre-line">{r.customer_message}</p>
        </Alert>
      )}
      {r.status === "awaiting_customer" && isOwner && <ReplyBox action={replyToRepair.bind(null, r.id)} label="Reply to Guitarz4U" />}

      <section className="card p-5">
        <h3 className="text-lg">Details</h3>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-tan">Guitar</dt>
          <dd>{statusLabel(GUITAR_TYPES, r.guitar_type)} {[r.brand, r.model].filter(Boolean).join(" ")}</dd>
          <dt className="text-tan">Requested</dt>
          <dd>{r.requested_services.map(repairServiceLabel).join(", ")}</dd>
          <dt className="text-tan">Preferred date</dt>
          <dd>{r.preferred_date ? `${formatDate(r.preferred_date)} (preference — not confirmed)` : "None given"}</dd>
        </dl>
        <p className="mt-3 whitespace-pre-line text-sm"><strong>Problem:</strong> {r.problem_description}</p>
        {r.notes && <p className="mt-2 whitespace-pre-line text-sm"><strong>Notes:</strong> {r.notes}</p>}
        <div className="mt-4"><PhotoGrid urls={urls} label="Repair" /></div>
        {open && isOwner && (
          <div className="mt-4">
            <AddPhotos bucket="repair-images" table="repair_images" fkColumn="repair_id" recordId={r.id} userId={user.id} remaining={12 - r.images.length} />
          </div>
        )}
      </section>
      <section className="card p-5">
        <h3 className="mb-4 text-lg">Progress</h3>
        <Timeline events={events} label={label} />
      </section>
      {isOwner && ["submitted", "awaiting_review", "awaiting_customer", "quote_provided", "approved"].includes(r.status) && (
        <ActionButton action={cancelRepair.bind(null, r.id)} confirm="Cancel this repair booking?" className="btn btn-outline text-danger">
          Cancel booking
        </ActionButton>
      )}
    </div>
  );
}

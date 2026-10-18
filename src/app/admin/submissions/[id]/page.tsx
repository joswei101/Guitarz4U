import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStatusEvents, signedUrls } from "@/lib/data/account";
import { AdminTitle } from "@/components/admin/AdminUi";
import { WorkflowForm } from "@/components/admin/WorkflowForm";
import { ContactCard } from "@/components/admin/ContactCard";
import { AdminNotes } from "@/components/admin/AdminNotes";
import { OfferForm } from "@/components/admin/OfferForm";
import { ActionButton } from "@/components/account/ActionButton";
import { Timeline } from "@/components/ui/Timeline";
import { PhotoGrid } from "@/components/ui/PhotoGrid";
import { StatusBadge } from "@/components/ui/Badges";
import { updateWorkflow, withdrawOffer } from "@/app/actions/admin";
import { SELLER_STATUSES, conditionLabel, statusLabel } from "@/lib/constants";
import { formatDate, formatDateTime, formatRand } from "@/lib/format";
import { SITE_URL } from "@/lib/env";

export const metadata = { title: "Seller submission" };

export default async function AdminSubmission({ params }: PageProps<"/admin/submissions/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("seller_submissions")
    .select("*, category:categories(name), images:seller_submission_images(storage_path), offers:seller_offers(*)")
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();
  const [events, urls] = await Promise.all([getStatusEvents("seller_submission", id), signedUrls("submission-images", s.images.map((i) => i.storage_path))]);
  const label = (x: string) => statusLabel(SELLER_STATUSES, x);
  const offers = [...s.offers].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const closed = ["withdrawn", "rejected", "purchased"].includes(s.status);
  return (
    <div>
      <AdminTitle title={`${s.brand} ${s.model}`} actions={<StatusBadge status={s.status} label={label(s.status)} />}>
        <Link href="/admin/submissions" className="link">← All submissions</Link> · {s.reference} · Received {formatDateTime(s.created_at)}
      </AdminTitle>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-lg">Guitar details</h2>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-tan">Type</dt><dd>{s.category?.name ?? "—"}</dd>
              <dt className="text-tan">Condition</dt><dd>{conditionLabel(s.condition)}</dd>
              <dt className="text-tan">Working?</dt><dd>{s.is_working ? "Yes" : "No — broken"}</dd>
              <dt className="text-tan">Asking price</dt><dd>{s.asking_price ? formatRand(s.asking_price) : "Not given"}</dd>
              <dt className="text-tan">Area</dt><dd>{s.location ?? "—"}</dd>
              <dt className="text-tan">Consent</dt><dd>{s.privacy_consent ? `Given ${formatDateTime(s.consent_at)}` : "No"}</dd>
            </dl>
            {s.defects && <p className="mt-3 whitespace-pre-line text-sm"><strong>Defects:</strong> {s.defects}</p>}
            {s.notes && <p className="mt-2 whitespace-pre-line text-sm"><strong>Notes / replies:</strong> {s.notes}</p>}
            <div className="mt-4"><PhotoGrid urls={urls} label={`${s.brand} ${s.model}`} /></div>
          </section>
          <section className="card p-5">
            <h2 className="mb-3 text-lg">Make an offer</h2>
            {closed ? <p className="text-sm text-tan">This submission is closed.</p> : <OfferForm submissionId={s.id} />}
            {offers.length > 0 && (
              <ul className="mt-5 space-y-2 border-t border-gold/30 pt-4 text-sm">
                {offers.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {formatDate(o.created_at)} — <strong>{formatRand(o.amount)}</strong>
                      {o.valid_until && ` (valid until ${formatDate(o.valid_until)})`}
                      {o.responded_at && ` · responded ${formatDateTime(o.responded_at)}`}
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={o.status} />
                      {o.status === "pending" && (
                        <ActionButton action={withdrawOffer.bind(null, o.id, s.id)} confirm="Withdraw this offer?" className="btn btn-ghost btn-sm">Withdraw</ActionButton>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card p-5">
            <h2 className="mb-4 text-lg">Update status</h2>
            <WorkflowForm action={updateWorkflow.bind(null, "seller_submissions", s.id)} statuses={SELLER_STATUSES} current={s.status} message={s.customer_message} />
            <p className="mt-3 text-xs text-tan">Tip: “More information requested” lets the seller reply and add photos. “Approved for inspection” invites them to bring the guitar in.</p>
          </section>
          <section className="card p-5">
            <h2 className="mb-4 text-lg">Timeline</h2>
            <Timeline events={events} label={label} />
          </section>
        </div>
        <div className="space-y-6">
          <ContactCard
            name={s.contact_name}
            phone={s.contact_phone}
            email={s.contact_email}
            preferred={s.preferred_contact}
            userId={s.user_id}
            waMessage={`Hi ${s.contact_name.split(" ")[0]}, this is Guitarz4U about your ${s.brand} ${s.model} (${s.reference}). ${SITE_URL}/account/submissions/${s.id}`}
          />
          <AdminNotes entityType="seller_submission" entityId={s.id} />
        </div>
      </div>
    </div>
  );
}

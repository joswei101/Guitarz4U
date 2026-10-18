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
import { replyToSubmission, respondToOffer, withdrawSubmission } from "@/app/actions/account";
import { SELLER_STATUSES, conditionLabel, statusLabel } from "@/lib/constants";
import { formatDate, formatDateTime, formatRand } from "@/lib/format";

export const metadata = { title: "Seller submission" };

export default async function SubmissionDetail({ params, searchParams }: PageProps<"/account/submissions/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { user } = await requireUser(`/account/submissions/${id}`);
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("seller_submissions")
    .select("*, category:categories(name), images:seller_submission_images(storage_path), offers:seller_offers(*)")
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();
  const [events, urls] = await Promise.all([
    getStatusEvents("seller_submission", id),
    signedUrls("submission-images", s.images.map((i) => i.storage_path)),
  ]);
  const label = (x: string) => statusLabel(SELLER_STATUSES, x);
  const offers = [...s.offers].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const pending = offers.find((o) => o.status === "pending");
  const open = ["submitted", "under_review", "more_info_requested"].includes(s.status);
  const isOwner = s.user_id === user.id;

  return (
    <div className="space-y-6">
      {sp.submitted && (
        <Alert tone="success" title="Thank you — your guitar has been submitted">
          We&apos;ll review it personally and get back to you. Submitting doesn&apos;t commit you or us to a sale.
          {sp.photoErrors && " Some photos could not be uploaded — you can add them again below."}
        </Alert>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/account/submissions" className="link text-sm">← All submissions</Link>
          <h2 className="mt-1 text-2xl">{s.brand} {s.model}</h2>
          <p className="text-sm text-tan">{s.reference} · submitted {formatDateTime(s.created_at)}</p>
        </div>
        <StatusBadge status={s.status} label={label(s.status)} />
      </div>

      {pending && isOwner && (
        <section className="card border-gold p-5" aria-labelledby="offer-h">
          <h3 id="offer-h" className="text-xl">Offer from Guitarz4U: {formatRand(pending.amount)}</h3>
          {pending.valid_until && <p className="text-sm text-tan">Valid until {formatDate(pending.valid_until)}</p>}
          {pending.message && <p className="mt-2 whitespace-pre-line">{pending.message}</p>}
          <p className="mt-3 text-sm">There&apos;s no obligation to accept. If you accept, we&apos;ll contact you to arrange the handover and payment.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ActionButton action={respondToOffer.bind(null, pending.id, s.id, true)} confirm={`Accept the offer of ${formatRand(pending.amount)}?`} className="btn btn-primary">
              Accept offer
            </ActionButton>
            <ActionButton action={respondToOffer.bind(null, pending.id, s.id, false)} confirm="Decline this offer?" className="btn btn-outline">
              Decline
            </ActionButton>
          </div>
        </section>
      )}

      {s.customer_message && !pending && (
        <Alert tone="info" title="Message from Guitarz4U">
          <p className="whitespace-pre-line">{s.customer_message}</p>
        </Alert>
      )}

      {s.status === "more_info_requested" && <ReplyBox action={replyToSubmission.bind(null, s.id)} label="Send the information we asked for" />}

      <section className="card p-5">
        <h3 className="text-lg">Your guitar</h3>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-tan">Type</dt><dd>{s.category?.name ?? "—"}</dd>
          <dt className="text-tan">Condition</dt><dd>{conditionLabel(s.condition)}</dd>
          <dt className="text-tan">Working?</dt><dd>{s.is_working ? "Yes" : "No — broken"}</dd>
          <dt className="text-tan">Asking price</dt><dd>{s.asking_price ? formatRand(s.asking_price) : "Not given"}</dd>
        </dl>
        {s.defects && <p className="mt-3 whitespace-pre-line text-sm"><strong>Defects:</strong> {s.defects}</p>}
        {s.notes && <p className="mt-2 whitespace-pre-line text-sm"><strong>Notes:</strong> {s.notes}</p>}
        <div className="mt-4">
          <PhotoGrid urls={urls} label={`${s.brand} ${s.model}`} />
        </div>
        {open && isOwner && (
          <div className="mt-4">
            <AddPhotos bucket="submission-images" table="seller_submission_images" fkColumn="submission_id" recordId={s.id} userId={user.id} remaining={12 - s.images.length} />
          </div>
        )}
      </section>

      {offers.length > 0 && (
        <section className="card p-5">
          <h3 className="text-lg">Offer history</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {offers.map((o) => (
              <li key={o.id} className="flex justify-between gap-3">
                <span>{formatDate(o.created_at)} — {formatRand(o.amount)}</span>
                <StatusBadge status={o.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-5">
        <h3 className="mb-4 text-lg">Progress</h3>
        <Timeline events={events} label={label} />
      </section>

      {isOwner && ["submitted", "under_review", "more_info_requested", "approved", "offer_made", "offer_declined"].includes(s.status) && (
        <ActionButton action={withdrawSubmission.bind(null, s.id)} confirm="Withdraw this submission?" className="btn btn-outline text-danger">
          Withdraw submission
        </ActionButton>
      )}
    </div>
  );
}

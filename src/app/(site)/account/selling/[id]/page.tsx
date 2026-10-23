import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUploadUrls } from "@/lib/storage";
import { formatDateTime, formatZAR } from "@/lib/format";
import { CONDITION_LABELS, SELLER_STATUS_LABELS, WORKING_LABELS, type ProductCondition, type SellerStatus, type WorkingState } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/Badge";
import { StatusTimeline } from "@/components/account/StatusTimeline";
import { ConfirmActionForm } from "@/components/account/ConfirmActionForm";
import { PhotoGrid } from "@/components/account/PhotoGrid";
import { respondOfferAction, withdrawSubmissionAction } from "@/app/(site)/account/actions";

export const metadata: Metadata = { title: "Seller submission", robots: { index: false } };

type Offer = { id: string; amount: number; message: string; status: string; created_at: string; responded_at: string | null };

export default async function SubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/account/selling/${id}`);
  const supabase = await createClient();
  const { data } = await supabase
    .from("seller_submissions")
    .select("*, category:categories(name), images:seller_submission_images(storage_path), offers:seller_offers(id, amount, message, status, created_at, responded_at)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) notFound();
  const s = data as unknown as {
    id: string; reference: string; status: SellerStatus; brand: string; model: string; condition: ProductCondition; is_working: WorkingState;
    fault_description: string; asking_price: number | null; notes: string; created_at: string; category: { name: string } | null;
    images: { storage_path: string }[]; offers: Offer[];
  };
  const photos = await signedUploadUrls(s.images.map((i) => i.storage_path));
  const offers = [...s.offers].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const pending = offers.find((o) => o.status === "pending");
  const accepted = s.status === "offer_accepted" ? offers.find((o) => o.status === "accepted") : undefined;

  return (
    <div className="space-y-6">
      <Link href="/account/selling" className="text-sm text-gold-ink">
        ← All submissions
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">
          {s.brand} {s.model}
        </h1>
        <StatusBadge status={s.status} label={SELLER_STATUS_LABELS[s.status]} />
      </div>
      <p className="text-sm text-ink-soft">Reference {s.reference} · submitted {formatDateTime(s.created_at)}</p>

      {accepted && (
        <p role="status" className="rounded-lg bg-success-bg p-4 text-sm text-success">
          You accepted the offer of {formatZAR(accepted.amount)} on {formatDateTime(accepted.responded_at)}. Guitarz4U will contact you privately to
          arrange inspection, payment and handover.
        </p>
      )}

      {pending && (
        <section className="card border-gold p-5" aria-labelledby="offer-heading">
          <h2 id="offer-heading" className="text-xl">
            Offer from Guitarz4U: {formatZAR(pending.amount)}
          </h2>
          {pending.message && <p className="mt-2 whitespace-pre-line text-sm">{pending.message}</p>}
          <p className="mt-2 text-xs text-ink-soft">
            Made {formatDateTime(pending.created_at)}. Accepting tells us you&apos;d like to proceed; we&apos;ll contact you privately to
            arrange inspection, payment and handover.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ConfirmActionForm action={respondOfferAction} hidden={{ offer_id: pending.id, submission_id: s.id, decision: "accept" }} label="Accept offer" className="btn btn-primary btn-sm" confirmText="Accept this offer?" />
            <ConfirmActionForm action={respondOfferAction} hidden={{ offer_id: pending.id, submission_id: s.id, decision: "decline" }} label="Decline offer" confirmText="Decline this offer?" />
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card space-y-4 p-5">
          <h2 className="text-xl">Your submission</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-ink-soft">Category</dt><dd>{s.category?.name}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-soft">Condition</dt><dd>{CONDITION_LABELS[s.condition]}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-soft">Working?</dt><dd>{WORKING_LABELS[s.is_working]}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-soft">Asking price</dt><dd>{s.asking_price !== null ? formatZAR(s.asking_price) : "Not specified"}</dd></div>
          </dl>
          {s.fault_description && (
            <div className="text-sm">
              <p className="font-semibold">Faults</p>
              <p className="whitespace-pre-line text-ink-soft">{s.fault_description}</p>
            </div>
          )}
          {s.notes && (
            <div className="text-sm">
              <p className="font-semibold">Notes</p>
              <p className="whitespace-pre-line text-ink-soft">{s.notes}</p>
            </div>
          )}
          <PhotoGrid photos={photos} />
          {offers.filter((o) => o.status !== "pending").length > 0 && (
            <div className="text-sm">
              <p className="font-semibold">Previous offers</p>
              <ul className="mt-1 space-y-1 text-ink-soft">
                {offers.filter((o) => o.status !== "pending").map((o) => (
                  <li key={o.id}>
                    {formatZAR(o.amount)} — {o.status} ({formatDateTime(o.created_at)})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!["completed", "withdrawn", "rejected"].includes(s.status) && (
            <div className="border-t border-line pt-4">
              <ConfirmActionForm action={withdrawSubmissionAction} hidden={{ id: s.id }} label="Withdraw submission" confirmText="Withdraw this submission?" />
            </div>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-4 text-xl">Status updates</h2>
          <StatusTimeline entityType="seller_submission" entityId={s.id} labels={SELLER_STATUS_LABELS} />
        </section>
      </div>
    </div>
  );
}

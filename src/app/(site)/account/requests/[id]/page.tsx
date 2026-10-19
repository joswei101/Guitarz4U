import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime, formatZAR } from "@/lib/format";
import { CONTACT_METHOD_LABELS, PAYMENT_NOTICE, PURCHASE_STATUS_LABELS, type ContactMethod, type PurchaseStatus } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/Badge";
import { StatusTimeline } from "@/components/account/StatusTimeline";
import { ConfirmActionForm } from "@/components/account/ConfirmActionForm";
import { cancelPurchaseRequestAction } from "@/app/(site)/account/actions";

export const metadata: Metadata = { title: "Purchase request", robots: { index: false } };

const CANCELLABLE: PurchaseStatus[] = ["submitted", "under_review", "awaiting_customer", "approved", "awaiting_eft"];

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/account/requests/${id}`);
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchase_requests")
    .select("*, items:purchase_request_items(id, title_snapshot, price_snapshot, product:products(slug, status))")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) notFound();
  const r = data as unknown as {
    id: string; reference: string; status: PurchaseStatus; estimated_total: number; created_at: string;
    contact_name: string; contact_email: string | null; contact_phone: string | null; preferred_contact: ContactMethod;
    customer_message: string; payment_confirmed_at: string | null; eft_instructions_sent_at: string | null;
    items: { id: string; title_snapshot: string; price_snapshot: number; product: { slug: string; status: string } | null }[];
  };

  return (
    <div className="space-y-6">
      <Link href="/account/requests" className="text-sm text-gold-ink">
        ← All purchase requests
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Request {r.reference}</h1>
        <StatusBadge status={r.status} label={PURCHASE_STATUS_LABELS[r.status]} />
      </div>
      <p className="notice text-sm">{PAYMENT_NOTICE}</p>

      {r.status === "awaiting_eft" && (
        <p className="rounded-lg bg-warning-bg p-4 text-sm text-warning">
          Guitarz4U has approved your request and sent EFT details to you privately on {formatDate(r.eft_instructions_sent_at)}. Only pay
          using the details sent to you directly by the owner. We will never ask for card details or banking passwords.
        </p>
      )}
      {r.payment_confirmed_at && (
        <p className="rounded-lg bg-success-bg p-4 text-sm text-success">
          Guitarz4U confirmed receipt of your payment on {formatDateTime(r.payment_confirmed_at)}. Collection will be arranged with you
          privately.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-xl">Requested items</h2>
          <ul className="mt-3 divide-y divide-line">
            {r.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-3 text-sm">
                <span>
                  {i.product && ["published", "reserved"].includes(i.product.status) ? (
                    <Link href={`/shop/${i.product.slug}`} className="text-walnut hover:text-gold-ink">
                      {i.title_snapshot}
                    </Link>
                  ) : (
                    i.title_snapshot
                  )}
                </span>
                <span className="font-semibold">{formatZAR(i.price_snapshot)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex justify-between border-t border-line pt-3 text-sm">
            <span className="text-ink-soft">Estimated total (not an invoice)</span>
            <span className="font-semibold">{formatZAR(r.estimated_total)}</span>
          </p>
          <dl className="mt-5 grid gap-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-ink-soft">Submitted</dt><dd>{formatDateTime(r.created_at)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-soft">Name</dt><dd>{r.contact_name}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-soft">Email</dt><dd className="break-all">{r.contact_email ?? "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-soft">Phone</dt><dd>{r.contact_phone ?? "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-soft">Preferred contact</dt><dd>{CONTACT_METHOD_LABELS[r.preferred_contact]}</dd></div>
          </dl>
          {r.customer_message && (
            <div className="mt-4 rounded-lg bg-cream p-3 text-sm">
              <p className="font-semibold">Your message</p>
              <p className="whitespace-pre-line">{r.customer_message}</p>
            </div>
          )}
          {CANCELLABLE.includes(r.status) && (
            <div className="mt-5 border-t border-line pt-4">
              <ConfirmActionForm
                action={cancelPurchaseRequestAction}
                hidden={{ id: r.id }}
                label="Cancel this request"
                pendingText="Cancelling…"
                confirmText="Cancel this purchase request?"
              />
            </div>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-4 text-xl">Status updates</h2>
          <StatusTimeline entityType="purchase_request" entityId={r.id} labels={PURCHASE_STATUS_LABELS} />
        </section>
      </div>
    </div>
  );
}

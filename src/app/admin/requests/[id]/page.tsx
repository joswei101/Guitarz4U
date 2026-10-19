import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, ContactLinks, KeyValue } from "@/components/admin/AdminUI";
import { StatusUpdateForm } from "@/components/admin/AdminForms";
import { AdminNotes } from "@/components/admin/AdminNotes";
import { StatusTimeline } from "@/components/account/StatusTimeline";
import { StatusBadge } from "@/components/ui/Badge";
import { setPurchaseStatusAction } from "@/app/admin/actions";
import { isEmailConfigured } from "@/lib/email";
import { formatDateTime, formatZAR } from "@/lib/format";
import {
  CONTACT_METHOD_LABELS,
  PRODUCT_STATUS_LABELS,
  PURCHASE_STATUS_LABELS,
  type ContactMethod,
  type ProductStatus,
  type PurchaseStatus,
} from "@/lib/constants";

export const metadata = { title: "Purchase request" };

// Which statuses the owner can move to from each status (mirrors the database rules).
const NEXT: Record<PurchaseStatus, PurchaseStatus[]> = {
  submitted: ["under_review", "awaiting_customer", "approved", "declined", "cancelled"],
  under_review: ["awaiting_customer", "approved", "declined", "cancelled"],
  awaiting_customer: ["under_review", "approved", "declined", "cancelled"],
  approved: ["awaiting_eft", "payment_confirmed", "awaiting_customer", "declined", "cancelled"],
  awaiting_eft: ["payment_confirmed", "awaiting_customer", "cancelled", "declined"],
  payment_confirmed: ["ready_for_collection", "completed", "cancelled"],
  ready_for_collection: ["completed", "cancelled"],
  completed: [],
  declined: [],
  cancelled: [],
};

export default async function AdminRequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchase_requests")
    .select("*, items:purchase_request_items(id, title_snapshot, price_snapshot, product:products(id, slug, status, price)), confirmer:profiles!purchase_requests_payment_confirmed_by_fkey(email)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const r = data as unknown as {
    id: string; reference: string; status: PurchaseStatus; user_id: string | null; contact_name: string; contact_email: string | null; contact_phone: string | null;
    preferred_contact: ContactMethod; customer_message: string; estimated_total: number; created_at: string; updated_at: string;
    eft_instructions_sent_at: string | null; payment_confirmed_at: string | null; completed_at: string | null; confirmer: { email: string | null } | null;
    items: { id: string; title_snapshot: string; price_snapshot: number; product: { id: string; slug: string; status: ProductStatus; price: number } | null }[];
  };
  const next = NEXT[r.status];
  const conflicts = r.items.filter((i) => !i.product || !["published", "reserved"].includes(i.product.status));

  return (
    <div className="max-w-6xl space-y-6">
      <Link href="/admin/requests" className="text-sm text-gold-ink">
        ← Purchase requests
      </Link>
      <AdminPageHeader
        title={`Request ${r.reference}`}
        description={<StatusBadge status={r.status} label={PURCHASE_STATUS_LABELS[r.status]} />}
      />

      {conflicts.length > 0 && !["completed", "declined", "cancelled"].includes(r.status) && (
        <p className="rounded-lg bg-danger-bg p-4 text-sm text-danger">
          Warning: {conflicts.map((c) => c.title_snapshot).join(", ")} {conflicts.length === 1 ? "is" : "are"} no longer available (sold, archived or removed).
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-lg">Requested items</h2>
            <ul className="mt-2 divide-y divide-line text-sm">
              {r.items.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {i.product ? (
                      <Link href={`/admin/products/${i.product.id}`} className="font-semibold text-walnut hover:text-gold-ink">
                        {i.title_snapshot}
                      </Link>
                    ) : (
                      i.title_snapshot
                    )}
                    {i.product && <span className="ml-2 badge badge-neutral">{PRODUCT_STATUS_LABELS[i.product.status]}</span>}
                  </span>
                  <span>
                    {formatZAR(i.price_snapshot)}
                    {i.product && Number(i.product.price) !== Number(i.price_snapshot) && (
                      <span className="ml-1 text-xs text-warning">(now {formatZAR(i.product.price)})</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between border-t border-line pt-2 text-sm font-semibold">
              <span>Estimated total</span>
              <span>{formatZAR(r.estimated_total)}</span>
            </p>
          </section>

          <section className="card space-y-4 p-5">
            <h2 className="text-lg">Customer</h2>
            <KeyValue
              items={[
                ["Name", r.contact_name],
                ["Email", r.contact_email],
                ["Phone", r.contact_phone],
                ["Prefers", CONTACT_METHOD_LABELS[r.preferred_contact]],
                ["Submitted", formatDateTime(r.created_at)],
                ["EFT details sent", r.eft_instructions_sent_at ? formatDateTime(r.eft_instructions_sent_at) : "Not yet"],
                ["Payment confirmed", r.payment_confirmed_at ? `${formatDateTime(r.payment_confirmed_at)}${r.confirmer?.email ? ` by ${r.confirmer.email}` : ""}` : "Not confirmed"],
                ["Completed", r.completed_at ? formatDateTime(r.completed_at) : "—"],
              ]}
            />
            {r.customer_message && (
              <div className="rounded-lg bg-cream/60 p-3 text-sm">
                <p className="font-semibold">Customer message</p>
                <p className="whitespace-pre-line">{r.customer_message}</p>
              </div>
            )}
            <ContactLinks name={r.contact_name} phone={r.contact_phone} email={r.contact_email} context={`your purchase request ${r.reference}`} />
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-lg">Customer-visible history</h2>
            <StatusTimeline entityType="purchase_request" entityId={r.id} labels={PURCHASE_STATUS_LABELS} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-lg">Update status</h2>
            {next.length ? (
              <>
                <ol className="mb-4 mt-2 list-decimal space-y-1 pl-5 text-xs text-ink-soft">
                  <li>Confirm availability and contact the customer privately.</li>
                  <li>Approve, then send your EFT details privately (WhatsApp/email) and choose &ldquo;Awaiting private EFT payment&rdquo;.</li>
                  <li>Check your own banking app. Only then choose &ldquo;Payment confirmed by administrator&rdquo;.</li>
                  <li>Arrange collection privately, then mark ready / completed.</li>
                </ol>
                <StatusUpdateForm
                  action={setPurchaseStatusAction}
                  id={r.id}
                  current={next[0]}
                  options={next.map((s) => ({ value: s, label: PURCHASE_STATUS_LABELS[s] }))}
                  withNote
                  emailAvailable={isEmailConfigured()}
                />
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">This request is closed.</p>
            )}
          </section>
          <AdminNotes entityType="purchase_request" entityId={r.id} path={`/admin/requests/${r.id}`} />
        </div>
      </div>
    </div>
  );
}

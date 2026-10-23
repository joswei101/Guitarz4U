import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedUploadUrls } from "@/lib/storage";
import { AdminPageHeader, ContactLinks, KeyValue } from "@/components/admin/AdminUI";
import { AmountMessageForm, StatusUpdateForm } from "@/components/admin/AdminForms";
import { AdminNotes } from "@/components/admin/AdminNotes";
import { PhotoGrid } from "@/components/account/PhotoGrid";
import { StatusTimeline } from "@/components/account/StatusTimeline";
import { StatusBadge } from "@/components/ui/Badge";
import { makeOfferAction, setSellerStatusAction } from "@/app/admin/actions";
import { isEmailConfigured } from "@/lib/email";
import { formatDateTime, formatZAR } from "@/lib/format";
import { CONDITION_LABELS, SELLER_STATUS_LABELS, WORKING_LABELS, type ProductCondition, type SellerStatus, type WorkingState } from "@/lib/constants";

export const metadata = { title: "Seller submission" };

export default async function AdminSubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("seller_submissions")
    .select("*, category:categories(name), images:seller_submission_images(storage_path), offers:seller_offers(id, amount, message, status, created_at, responded_at)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const s = data as unknown as {
    id: string; reference: string; status: SellerStatus; seller_name: string; contact_number: string; email: string | null; brand: string; model: string;
    condition: ProductCondition; is_working: WorkingState; fault_description: string; asking_price: number | null; notes: string; created_at: string;
    category: { name: string } | null; images: { storage_path: string }[];
    offers: { id: string; amount: number; message: string; status: string; created_at: string; responded_at: string | null }[];
  };
  const photos = await signedUploadUrls(s.images.map((i) => i.storage_path));
  const closed = ["completed", "withdrawn", "rejected"].includes(s.status);
  const statusOptions: SellerStatus[] = ["under_review", "more_info_requested", "approved", "rejected", "completed"];
  const email = isEmailConfigured();

  return (
    <div className="max-w-6xl space-y-6">
      <Link href="/admin/submissions" className="text-sm text-gold-ink">
        ← Seller submissions
      </Link>
      <AdminPageHeader
        title={`${s.brand} ${s.model}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={s.status} label={SELLER_STATUS_LABELS[s.status]} /> {s.reference} · submitted {formatDateTime(s.created_at)}
          </span>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <section className="card space-y-4 p-5">
            <h2 className="text-lg">Guitar</h2>
            <KeyValue
              items={[
                ["Category", s.category?.name],
                ["Condition", CONDITION_LABELS[s.condition]],
                ["Works?", WORKING_LABELS[s.is_working]],
                ["Asking price", s.asking_price !== null ? formatZAR(s.asking_price) : "Not specified"],
                ["Faults", <span key="f" className="whitespace-pre-line">{s.fault_description || "None described"}</span>],
                ["Notes", <span key="n" className="whitespace-pre-line">{s.notes || "—"}</span>],
              ]}
            />
            <PhotoGrid photos={photos} />
          </section>
          <section className="card space-y-4 p-5">
            <h2 className="text-lg">Seller</h2>
            <KeyValue items={[["Name", s.seller_name], ["Phone", s.contact_number], ["Email", s.email]]} />
            <ContactLinks name={s.seller_name} phone={s.contact_number} email={s.email} context={`the ${s.brand} ${s.model} you submitted (${s.reference})`} />
          </section>
          <section className="card p-5">
            <h2 className="text-lg">Offers</h2>
            {s.offers.length ? (
              <ul className="mt-2 divide-y divide-line text-sm">
                {[...s.offers]
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .map((o) => (
                    <li key={o.id} className="py-2">
                      <strong>{formatZAR(o.amount)}</strong> — {o.status} · {formatDateTime(o.created_at)}
                      {o.responded_at && ` · responded ${formatDateTime(o.responded_at)}`}
                      {o.message && <p className="text-ink-soft">{o.message}</p>}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">No offers yet.</p>
            )}
          </section>
          <section className="card p-5">
            <h2 className="mb-4 text-lg">Seller-visible history</h2>
            <StatusTimeline entityType="seller_submission" entityId={s.id} labels={SELLER_STATUS_LABELS} />
          </section>
        </div>
        <div className="space-y-6">
          {!closed && (
            <>
              <section className="card p-5">
                <h2 className="text-lg">Make a personal offer</h2>
                <p className="mb-3 text-xs text-ink-soft">The seller can accept or decline in their account. A new offer replaces any pending one.</p>
                <AmountMessageForm action={makeOfferAction} id={s.id} amountLabel="Offer amount (R)" messageLabel="Message to seller (optional)" submitLabel="Send offer" emailAvailable={email} />
              </section>
              <section className="card p-5">
                <h2 className="text-lg">Update status</h2>
                <div className="mt-3">
                  <StatusUpdateForm
                    action={setSellerStatusAction}
                    id={s.id}
                    current={s.status === "submitted" ? "under_review" : s.status}
                    options={statusOptions.map((v) => ({ value: v, label: SELLER_STATUS_LABELS[v] }))}
                    emailAvailable={email}
                  />
                </div>
              </section>
            </>
          )}
          <AdminNotes entityType="seller_submission" entityId={s.id} path={`/admin/submissions/${s.id}`} />
        </div>
      </div>
    </div>
  );
}

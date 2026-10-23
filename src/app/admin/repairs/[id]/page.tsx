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
import { provideQuoteAction, setRepairStatusAction } from "@/app/admin/actions";
import { isEmailConfigured } from "@/lib/email";
import { formatDate, formatDateTime, formatZAR } from "@/lib/format";
import { CONTACT_METHOD_LABELS, REPAIR_SERVICES, REPAIR_STATUS_LABELS, type ContactMethod, type RepairStatus } from "@/lib/constants";

export const metadata = { title: "Repair booking" };

export default async function AdminRepairDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("repair_bookings").select("*, category:categories(name), images:repair_images(storage_path)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const b = data as unknown as {
    id: string; reference: string; status: RepairStatus; contact_name: string; contact_phone: string; contact_email: string | null; preferred_contact: ContactMethod;
    guitar_brand: string; guitar_model: string; services: string[]; problem_description: string; preferred_date: string | null; notes: string; created_at: string;
    quote_amount: number | null; quote_message: string | null; quote_provided_at: string | null; customer_quote_response: string | null; customer_quote_response_at: string | null;
    category: { name: string } | null; images: { storage_path: string }[];
  };
  const photos = await signedUploadUrls(b.images.map((i) => i.storage_path));
  const closed = ["completed", "cancelled"].includes(b.status);
  const statusOptions: RepairStatus[] = ["awaiting_review", "awaiting_info", "approved", "in_progress", "awaiting_collection", "completed", "cancelled"];
  const email = isEmailConfigured();

  return (
    <div className="max-w-6xl space-y-6">
      <Link href="/admin/repairs" className="text-sm text-gold-ink">
        ← Repair bookings
      </Link>
      <AdminPageHeader
        title={`${b.guitar_brand} ${b.guitar_model}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={b.status} label={REPAIR_STATUS_LABELS[b.status]} /> {b.reference} · booked {formatDateTime(b.created_at)}
          </span>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <section className="card space-y-4 p-5">
            <h2 className="text-lg">Request</h2>
            <KeyValue
              items={[
                ["Guitar type", b.category?.name],
                ["Work requested", b.services.map((s) => REPAIR_SERVICES.find((x) => x.id === s)?.name ?? s).join(", ")],
                ["Preferred date", b.preferred_date ? formatDate(b.preferred_date) : "Flexible"],
                ["Problem", <span key="p" className="whitespace-pre-line">{b.problem_description}</span>],
                ["Notes", <span key="n" className="whitespace-pre-line">{b.notes || "—"}</span>],
                [
                  "Quote",
                  b.quote_amount !== null
                    ? `${formatZAR(b.quote_amount)} (sent ${formatDateTime(b.quote_provided_at)})${b.customer_quote_response ? ` — customer ${b.customer_quote_response} ${formatDateTime(b.customer_quote_response_at)}` : " — awaiting customer"}`
                    : "Not yet quoted",
                ],
              ]}
            />
            <PhotoGrid photos={photos} />
          </section>
          <section className="card space-y-4 p-5">
            <h2 className="text-lg">Customer</h2>
            <KeyValue items={[["Name", b.contact_name], ["Phone", b.contact_phone], ["Email", b.contact_email], ["Prefers", CONTACT_METHOD_LABELS[b.preferred_contact]]]} />
            <ContactLinks name={b.contact_name} phone={b.contact_phone} email={b.contact_email} context={`your repair booking ${b.reference}`} />
          </section>
          <section className="card p-5">
            <h2 className="mb-4 text-lg">Customer-visible history</h2>
            <StatusTimeline entityType="repair_booking" entityId={b.id} labels={REPAIR_STATUS_LABELS} />
          </section>
        </div>
        <div className="space-y-6">
          {!closed && (
            <>
              <section className="card p-5">
                <h2 className="text-lg">{b.quote_amount !== null ? "Send a revised quote" : "Provide a quote"}</h2>
                <div className="mt-3">
                  <AmountMessageForm action={provideQuoteAction} id={b.id} amountLabel="Quote amount (R)" messageLabel="What the quote covers" submitLabel="Send quote" emailAvailable={email} />
                </div>
              </section>
              <section className="card p-5">
                <h2 className="text-lg">Update status</h2>
                <p className="mt-1 text-xs text-ink-soft">Move to &ldquo;Approved&rdquo; once the booking is confirmed with the customer; &ldquo;In progress&rdquo; is only allowed after approval.</p>
                <div className="mt-3">
                  <StatusUpdateForm
                    action={setRepairStatusAction}
                    id={b.id}
                    current={b.status === "submitted" ? "awaiting_review" : b.status === "quote_provided" ? "approved" : b.status}
                    options={statusOptions.map((v) => ({ value: v, label: REPAIR_STATUS_LABELS[v] }))}
                    emailAvailable={email}
                  />
                </div>
              </section>
            </>
          )}
          <AdminNotes entityType="repair_booking" entityId={b.id} path={`/admin/repairs/${b.id}`} />
        </div>
      </div>
    </div>
  );
}

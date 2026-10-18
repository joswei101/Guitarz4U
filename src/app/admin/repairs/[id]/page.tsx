import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStatusEvents, signedUrls } from "@/lib/data/account";
import { getPrivateSnippets } from "@/lib/data/admin";
import { AdminTitle } from "@/components/admin/AdminUi";
import { WorkflowForm } from "@/components/admin/WorkflowForm";
import { ContactCard } from "@/components/admin/ContactCard";
import { AdminNotes } from "@/components/admin/AdminNotes";
import { Timeline } from "@/components/ui/Timeline";
import { PhotoGrid } from "@/components/ui/PhotoGrid";
import { StatusBadge } from "@/components/ui/Badges";
import { Alert } from "@/components/ui/Alert";
import { updateWorkflow } from "@/app/actions/admin";
import { GUITAR_TYPES, REPAIR_STATUSES, repairServiceLabel, statusLabel } from "@/lib/constants";
import { formatDate, formatDateTime, formatRand } from "@/lib/format";
import { SITE_URL } from "@/lib/env";

export const metadata = { title: "Repair booking" };

export default async function AdminRepair({ params }: PageProps<"/admin/repairs/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: r } = await supabase.from("repair_bookings").select("*, images:repair_images(storage_path)").eq("id", id).maybeSingle();
  if (!r) notFound();
  const [events, urls, snippets] = await Promise.all([getStatusEvents("repair_booking", id), signedUrls("repair-images", r.images.map((i) => i.storage_path)), getPrivateSnippets()]);
  const label = (s: string) => statusLabel(REPAIR_STATUSES, s);
  return (
    <div>
      <AdminTitle title={`Repair ${r.reference}`} actions={<StatusBadge status={r.status} label={label(r.status)} />}>
        <Link href="/admin/repairs" className="link">← All repairs</Link> · Received {formatDateTime(r.created_at)}
      </AdminTitle>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-lg">Request</h2>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-tan">Guitar</dt><dd>{statusLabel(GUITAR_TYPES, r.guitar_type)} {[r.brand, r.model].filter(Boolean).join(" ")}</dd>
              <dt className="text-tan">Services</dt><dd>{r.requested_services.map(repairServiceLabel).join(", ")}</dd>
              <dt className="text-tan">Preferred date</dt><dd>{r.preferred_date ? formatDate(r.preferred_date) : "—"}</dd>
              <dt className="text-tan">Quote</dt><dd>{r.quote_amount !== null ? `${formatRand(r.quote_amount)} (${r.quote_status})` : "None yet"}</dd>
              <dt className="text-tan">Appointment</dt><dd>{r.appointment_at ? formatDateTime(r.appointment_at) : "Not confirmed"}</dd>
            </dl>
            <p className="mt-3 whitespace-pre-line text-sm"><strong>Problem:</strong> {r.problem_description}</p>
            {r.notes && <p className="mt-2 whitespace-pre-line text-sm"><strong>Notes / replies:</strong> {r.notes}</p>}
            <div className="mt-4"><PhotoGrid urls={urls} label="Repair" /></div>
          </section>
          {r.quote_status === "accepted" && r.status === "awaiting_review" && (
            <Alert tone="success" title="Customer accepted the quote">Approve the repair (status “Approved”) when you&apos;re ready to go ahead.</Alert>
          )}
          <section className="card p-5">
            <h2 className="mb-4 text-lg">Quote, status &amp; message</h2>
            <WorkflowForm
              action={updateWorkflow.bind(null, "repair_bookings", r.id)}
              statuses={REPAIR_STATUSES}
              current={r.status}
              message={r.customer_message}
              snippets={snippets}
              repair={{ quote_amount: r.quote_amount, quote_message: r.quote_message, appointment_at: r.appointment_at }}
            />
            <p className="mt-3 text-xs text-tan">To send a quote: enter the amount and details and set status to “Quote provided”.</p>
          </section>
          <section className="card p-5">
            <h2 className="mb-4 text-lg">Timeline</h2>
            <Timeline events={events} label={label} />
          </section>
        </div>
        <div className="space-y-6">
          <ContactCard
            name={r.contact_name}
            phone={r.contact_phone}
            email={r.contact_email}
            preferred={r.preferred_contact}
            userId={r.user_id}
            waMessage={`Hi ${r.contact_name.split(" ")[0]}, this is Guitarz4U about your repair booking ${r.reference}. ${SITE_URL}/account/repairs/${r.id}`}
          />
          <AdminNotes entityType="repair_booking" entityId={r.id} />
        </div>
      </div>
    </div>
  );
}

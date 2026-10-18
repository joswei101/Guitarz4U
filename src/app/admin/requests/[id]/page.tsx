import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStatusEvents } from "@/lib/data/account";
import { getPrivateSnippets } from "@/lib/data/admin";
import { AdminTitle } from "@/components/admin/AdminUi";
import { WorkflowForm } from "@/components/admin/WorkflowForm";
import { ContactCard } from "@/components/admin/ContactCard";
import { AdminNotes } from "@/components/admin/AdminNotes";
import { ActionButton } from "@/components/account/ActionButton";
import { Timeline } from "@/components/ui/Timeline";
import { AvailabilityBadge, StatusBadge } from "@/components/ui/Badges";
import { markRequestItemsSold, updateWorkflow } from "@/app/actions/admin";
import { PURCHASE_REQUEST_STATUSES, statusLabel } from "@/lib/constants";
import { formatDateTime, formatRand } from "@/lib/format";
import { SITE_URL } from "@/lib/env";

export const metadata = { title: "Purchase request" };

export default async function AdminRequest({ params }: PageProps<"/admin/requests/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("purchase_requests")
    .select("*, items:purchase_request_items(id, title_snapshot, price_snapshot, quantity, product:products(id, slug, status, quantity))")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();
  const [events, snippets] = await Promise.all([getStatusEvents("purchase_request", id), getPrivateSnippets()]);
  const label = (s: string) => statusLabel(PURCHASE_REQUEST_STATUSES, s);
  return (
    <div>
      <AdminTitle title={`Purchase request ${r.reference}`} actions={<StatusBadge status={r.status} label={label(r.status)} />}>
        <Link href="/admin/requests" className="link">← All requests</Link> · Received {formatDateTime(r.created_at)}
      </AdminTitle>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-lg">Requested items</h2>
            <table className="table-g4u mt-3">
              <thead><tr><th>Item</th><th>Qty</th><th>Price at request</th><th>Now</th></tr></thead>
              <tbody>
                {r.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.product ? <Link href={`/admin/products/${i.product.id}`} className="link">{i.title_snapshot}</Link> : `${i.title_snapshot} (deleted)`}</td>
                    <td>{i.quantity}</td>
                    <td>{formatRand(i.price_snapshot)}</td>
                    <td>{i.product && <AvailabilityBadge status={i.product.status} quantity={i.product.quantity} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-right font-semibold">Estimated total: {formatRand(r.total_estimate)}</p>
            {r.message && <p className="mt-3 whitespace-pre-line rounded bg-cream-2 p-3 text-sm"><strong>Customer message:</strong> {r.message}</p>}
            <div className="mt-4">
              <ActionButton action={markRequestItemsSold.bind(null, r.id)} confirm="Mark all items in this request as SOLD?" className="btn btn-outline btn-sm">
                Mark these items as sold
              </ActionButton>
            </div>
          </section>
          <section className="card p-5">
            <h2 className="mb-4 text-lg">Update the customer</h2>
            <WorkflowForm action={updateWorkflow.bind(null, "purchase_requests", r.id)} statuses={PURCHASE_REQUEST_STATUSES} current={r.status} message={r.customer_message} snippets={snippets} />
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
            waMessage={`Hi ${r.contact_name.split(" ")[0]}, this is Guitarz4U about your request ${r.reference} (${r.items.map((i) => i.title_snapshot).join(", ")}). ${SITE_URL}/account/requests/${r.id}`}
          />
          <AdminNotes entityType="purchase_request" entityId={r.id} />
        </div>
      </div>
    </div>
  );
}

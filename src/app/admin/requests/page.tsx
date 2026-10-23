import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, StatusFilter } from "@/components/admin/AdminUI";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDateTime, formatZAR } from "@/lib/format";
import { CONTACT_METHOD_LABELS, PURCHASE_STATUS_LABELS, PURCHASE_STATUS_ORDER, type ContactMethod, type PurchaseStatus } from "@/lib/constants";

export const metadata = { title: "Purchase requests" };

const OPEN: PurchaseStatus[] = ["submitted", "under_review", "awaiting_customer", "approved", "awaiting_eft", "payment_confirmed", "ready_for_collection"];

export default async function AdminRequests({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("purchase_requests")
    .select("id, reference, status, contact_name, preferred_contact, estimated_total, created_at, items:purchase_request_items(title_snapshot)")
    .order("created_at", { ascending: false })
    .limit(200);
  query = status && (PURCHASE_STATUS_ORDER as string[]).includes(status) ? query.eq("status", status) : query.in("status", OPEN);
  const { data } = await query;
  const rows = (data ?? []) as unknown as {
    id: string; reference: string; status: PurchaseStatus; contact_name: string; preferred_contact: ContactMethod; estimated_total: number; created_at: string;
    items: { title_snapshot: string }[];
  }[];

  return (
    <div>
      <AdminPageHeader
        title="Purchase requests"
        description="Review each request, contact the customer privately, send EFT details privately, then confirm payment only after checking your own bank account."
      />
      <StatusFilter base="/admin/requests" current={status} options={PURCHASE_STATUS_ORDER.map((s) => ({ value: s, label: PURCHASE_STATUS_LABELS[s] }))} />
      <div className="card overflow-x-auto">
        <table className="table-g4u">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Est. total</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/requests/${r.id}`} className="font-semibold text-walnut hover:text-gold-ink">
                    {r.reference}
                  </Link>
                </td>
                <td>
                  {r.contact_name}
                  <span className="block text-xs text-ink-soft">via {CONTACT_METHOD_LABELS[r.preferred_contact]}</span>
                </td>
                <td className="max-w-xs truncate">{r.items.map((i) => i.title_snapshot).join(", ")}</td>
                <td className="whitespace-nowrap">{formatZAR(r.estimated_total)}</td>
                <td>
                  <StatusBadge status={r.status} label={PURCHASE_STATUS_LABELS[r.status]} />
                </td>
                <td className="whitespace-nowrap text-ink-soft">{formatDateTime(r.created_at)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-ink-soft">
                  No purchase requests here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

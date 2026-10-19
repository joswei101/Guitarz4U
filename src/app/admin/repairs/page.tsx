import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, StatusFilter } from "@/components/admin/AdminUI";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate, formatDateTime } from "@/lib/format";
import { REPAIR_SERVICES, REPAIR_STATUS_LABELS, type RepairStatus } from "@/lib/constants";

export const metadata = { title: "Repair bookings" };

export default async function AdminRepairs({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("repair_bookings")
    .select("id, reference, contact_name, guitar_brand, guitar_model, services, preferred_date, status, customer_quote_response, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  query =
    status && status in REPAIR_STATUS_LABELS
      ? query.eq("status", status)
      : query.in("status", ["submitted", "awaiting_review", "awaiting_info", "quote_provided", "approved", "in_progress", "awaiting_collection"]);
  const { data } = await query;
  const rows = (data ?? []) as {
    id: string; reference: string; contact_name: string; guitar_brand: string; guitar_model: string; services: string[]; preferred_date: string | null;
    status: RepairStatus; customer_quote_response: string | null; created_at: string;
  }[];

  return (
    <div>
      <AdminPageHeader title="Repair bookings" description="Assess each request, send a quote, and only start work once the booking is approved." />
      <StatusFilter base="/admin/repairs" current={status} options={Object.entries(REPAIR_STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
      <div className="card overflow-x-auto">
        <table className="table-g4u">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Customer</th>
              <th>Guitar</th>
              <th>Work</th>
              <th>Preferred date</th>
              <th>Status</th>
              <th>Booked</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/repairs/${r.id}`} className="font-semibold text-walnut hover:text-gold-ink">
                    {r.reference}
                  </Link>
                </td>
                <td>{r.contact_name}</td>
                <td>
                  {r.guitar_brand} {r.guitar_model}
                </td>
                <td className="max-w-xs text-xs">{r.services.map((s) => REPAIR_SERVICES.find((x) => x.id === s)?.name ?? s).join(", ")}</td>
                <td className="whitespace-nowrap">{r.preferred_date ? formatDate(r.preferred_date) : "Flexible"}</td>
                <td>
                  <StatusBadge status={r.status} label={REPAIR_STATUS_LABELS[r.status]} />
                  {r.customer_quote_response && <span className="mt-1 block text-xs">Quote {r.customer_quote_response}</span>}
                </td>
                <td className="whitespace-nowrap text-ink-soft">{formatDateTime(r.created_at)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-ink-soft">
                  No repair bookings here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

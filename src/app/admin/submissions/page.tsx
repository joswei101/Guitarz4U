import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, StatusFilter } from "@/components/admin/AdminUI";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDateTime, formatZAR } from "@/lib/format";
import { CONDITION_LABELS, SELLER_STATUS_LABELS, WORKING_LABELS, type ProductCondition, type SellerStatus, type WorkingState } from "@/lib/constants";

export const metadata = { title: "Seller submissions" };

export default async function AdminSubmissions({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("seller_submissions")
    .select("id, reference, seller_name, brand, model, condition, is_working, asking_price, status, created_at, images:seller_submission_images(id)")
    .order("created_at", { ascending: false })
    .limit(200);
  query =
    status && status in SELLER_STATUS_LABELS
      ? query.eq("status", status)
      : query.in("status", ["submitted", "under_review", "more_info_requested", "offer_made", "offer_accepted", "approved"]);
  const { data } = await query;
  const rows = (data ?? []) as unknown as {
    id: string; reference: string; seller_name: string; brand: string; model: string; condition: ProductCondition; is_working: WorkingState;
    asking_price: number | null; status: SellerStatus; created_at: string; images: { id: string }[];
  }[];

  return (
    <div>
      <AdminPageHeader title="Seller submissions & offers" description="Guitars people would like to sell to you. You decide what to buy and what to offer — nothing is promised automatically." />
      <StatusFilter base="/admin/submissions" current={status} options={Object.entries(SELLER_STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
      <div className="card overflow-x-auto">
        <table className="table-g4u">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Guitar</th>
              <th>Seller</th>
              <th>Condition</th>
              <th>Asking</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/submissions/${r.id}`} className="font-semibold text-walnut hover:text-gold-ink">
                    {r.reference}
                  </Link>
                </td>
                <td>
                  {r.brand} {r.model}
                  <span className="block text-xs text-ink-soft">{r.images.length} photo(s)</span>
                </td>
                <td>{r.seller_name}</td>
                <td>
                  {CONDITION_LABELS[r.condition]}
                  <span className="block text-xs text-ink-soft">Works: {WORKING_LABELS[r.is_working]}</span>
                </td>
                <td className="whitespace-nowrap">{r.asking_price !== null ? formatZAR(r.asking_price) : "—"}</td>
                <td>
                  <StatusBadge status={r.status} label={SELLER_STATUS_LABELS[r.status]} />
                </td>
                <td className="whitespace-nowrap text-ink-soft">{formatDateTime(r.created_at)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-ink-soft">
                  No submissions here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Audit log" };

const PAGE = 50;

export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ page?: string; entity?: string }> }) {
  const { page: rawPage, entity } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const supabase = await createClient();
  let query = supabase
    .from("audit_logs")
    .select("id, actor_email, action, entity_type, entity_id, details, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (entity) query = query.eq("entity_type", entity);
  const { data, count } = await query;
  const rows = (data ?? []) as { id: number; actor_email: string | null; action: string; entity_type: string; entity_id: string | null; details: Record<string, unknown>; created_at: string }[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const entities = ["products", "product_private", "purchase_requests", "reservations", "seller_submissions", "seller_offers", "repair_bookings", "reviews", "site_settings", "profiles", "brands"];

  return (
    <div>
      <AdminPageHeader title="Audit log" description="An append-only record of important changes. It cannot be edited or deleted from the website." />
      <nav aria-label="Filter" className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/admin/audit" className={`rounded-full px-3 py-1.5 text-sm no-underline ${!entity ? "bg-walnut text-cream-light" : "bg-white text-walnut"}`}>
          All
        </Link>
        {entities.map((e) => (
          <Link key={e} href={`/admin/audit?entity=${e}`} className={`rounded-full px-3 py-1.5 text-sm no-underline ${entity === e ? "bg-walnut text-cream-light" : "bg-white text-walnut"}`}>
            {e.replace(/_/g, " ")}
          </Link>
        ))}
      </nav>
      <div className="card overflow-x-auto">
        <table className="table-g4u">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Action</th>
              <th>Record</th>
              <th>Changes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                <td className="break-all">{r.actor_email ?? "system / customer"}</td>
                <td>{r.action}</td>
                <td className="text-xs">
                  {r.entity_type}
                  <span className="block text-ink-soft">{r.entity_id?.slice(0, 13)}</span>
                </td>
                <td>
                  <details>
                    <summary className="cursor-pointer text-xs text-gold-ink">{Object.keys(r.details ?? {}).slice(0, 4).join(", ") || "details"}</summary>
                    <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap break-all rounded bg-cream/60 p-2 text-[0.7rem]">{JSON.stringify(r.details, null, 1)}</pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav aria-label="Pagination" className="mt-4 flex items-center justify-center gap-3 text-sm">
        {page > 1 && <Link href={`/admin/audit?page=${page - 1}${entity ? `&entity=${entity}` : ""}`} className="btn btn-outline btn-sm">Newer</Link>}
        <span>
          Page {page} of {pages}
        </span>
        {page < pages && <Link href={`/admin/audit?page=${page + 1}${entity ? `&entity=${entity}` : ""}`} className="btn btn-outline btn-sm">Older</Link>}
      </nav>
    </div>
  );
}

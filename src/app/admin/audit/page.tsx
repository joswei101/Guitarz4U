import { createClient } from "@/lib/supabase/server";
import { AdminTitle } from "@/components/admin/AdminUi";
import { Pagination } from "@/components/ui/Pagination";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Audit log" };
const PER = 50;

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const table = typeof sp.table === "string" ? sp.table : "";
  const supabase = await createClient();
  let q = supabase.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PER, page * PER - 1);
  if (table) q = q.eq("table_name", table);
  const { data, count } = await q;
  const summary = (changes: unknown, action: string) => {
    if (!changes || typeof changes !== "object") return "";
    if (action !== "update") {
      const c = changes as Record<string, unknown>;
      return String(c.title ?? c.reference ?? c.name ?? c.key ?? "");
    }
    return Object.entries(changes as Record<string, { from: unknown; to: unknown }>)
      .slice(0, 6)
      .map(([k, v]) => `${k}: ${JSON.stringify(v?.from)?.slice(0, 40)} → ${JSON.stringify(v?.to)?.slice(0, 40)}`)
      .join(" · ");
  };
  return (
    <div>
      <AdminTitle title="Audit log">A permanent record of administrative changes. Entries cannot be edited or deleted from the website.</AdminTitle>
      <form className="card mb-4 flex flex-wrap items-end gap-2 p-3" action="/admin/audit">
        <div>
          <label htmlFor="at" className="label">Area</label>
          <select id="at" name="table" defaultValue={table} className="select">
            <option value="">All</option>
            {["products", "product_private", "product_images", "purchase_requests", "reservations", "seller_submissions", "seller_offers", "repair_bookings", "reviews", "site_settings", "profiles", "data_requests", "categories", "brands", "auth.users"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table-g4u">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Area</th><th>Details</th></tr></thead>
          <tbody>
            {(data ?? []).map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap text-xs">{formatDateTime(a.created_at)}</td>
                <td className="text-xs">{a.actor_email ?? (a.actor_id ? a.actor_id.slice(0, 8) : "System")}</td>
                <td>{a.action}</td>
                <td className="text-xs">{a.table_name}</td>
                <td className="max-w-md break-words text-xs">{summary(a.changes, a.action)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={Math.ceil((count ?? 0) / PER)} makeHref={(p) => `/admin/audit?${new URLSearchParams({ table, page: String(p) })}`} />
    </div>
  );
}

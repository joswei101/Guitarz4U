import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Empty } from "@/components/ui";

export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const rows = await query<{ id: string; actor_email: string | null; action: string; entity_type: string; entity_id: string; details: Record<string, unknown>; created_at: Date }>(
    `select id, actor_email, action, entity_type, entity_id, details, created_at from audit_logs
     where ($1='' or action ilike '%'||$1||'%' or entity_id ilike '%'||$1||'%' or details::text ilike '%'||$1||'%') order by id desc limit 300`,
    [q],
  );
  return (
    <div className="stack">
      <h1 style={{ fontSize: "2rem" }}>Audit log</h1>
      <p className="muted">An append-only record of important administrator actions. Entries cannot be edited or deleted.</p>
      <form className="row" action="/admin/audit">
        <label className="sr-only" htmlFor="q">Search audit log</label>
        <input id="q" name="q" className="input" defaultValue={q} placeholder="Search action, reference…" style={{ maxWidth: 320 }} />
        <button className="btn btn-outline btn-sm">Search</button>
      </form>
      {rows.length === 0 ? <Empty title="No entries" /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Details</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td className="small" style={{ whiteSpace: "nowrap" }}>{formatDateTime(r.created_at)}</td>
              <td className="small">{r.actor_email ?? "system"}</td>
              <td><code>{r.action}</code></td>
              <td className="small">{r.entity_type} {r.entity_id.slice(0, 8)}</td>
              <td className="small"><code style={{ wordBreak: "break-all" }}>{JSON.stringify(r.details)}</code></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}

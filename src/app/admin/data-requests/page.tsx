import Link from "next/link";
import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Empty, StatusBadge } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { processDataRequest } from "../actions";

export default async function AdminDataRequests({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const rows = await query<{ id: string; user_id: string | null; name: string | null; email: string | null; kind: string; status: string; details: string; admin_note: string; created_at: Date; completed_at: Date | null }>(
    `select d.*, u.name, u.email from data_requests d left join "user" u on u.id=d.user_id order by (d.status='pending') desc, d.created_at desc limit 200`,
  );
  return (
    <div className="stack">
      <Flash msg={sp.msg} />
      <h1 style={{ fontSize: "2rem" }}>Privacy requests (POPIA)</h1>
      <p className="muted">Customers can download their own data at any time from their account. Deletion requests are processed here: the account and personal details are removed and business records are anonymised. Respond within a reasonable time (POPIA).</p>
      {rows.length === 0 ? <Empty title="No privacy requests" /> : rows.map((r) => (
        <article key={r.id} className="card stack">
          <div className="row between">
            <strong>{r.kind === "deletion" ? "Account deletion" : "Data export"} — {r.name ?? "unknown"} ({r.email ?? "—"})</strong>
            <StatusBadge status={r.status === "pending" ? "pending" : r.status === "completed" ? "completed" : "rejected"} label={r.status} />
          </div>
          <p className="small muted" style={{ margin: 0 }}>Requested {formatDateTime(r.created_at)}{r.completed_at ? ` · processed ${formatDateTime(r.completed_at)}` : ""}</p>
          {r.details && <p className="pre-line" style={{ margin: 0 }}>“{r.details}”</p>}
          {r.user_id && <p className="small" style={{ margin: 0 }}><Link href={`/admin/customers/${r.user_id}`}>View customer records</Link> · <a href={`/api/admin/user-export/${r.user_id}`}>Download their data (JSON)</a></p>}
          {r.status === "pending" && (
            <form action={processDataRequest} className="form card-flat">
              <input type="hidden" name="id" value={r.id} />
              <div className="field"><label htmlFor={`note-${r.id}`}>Note to customer (optional)</label><input id={`note-${r.id}`} name="note" type="text" maxLength={1000} /></div>
              {r.kind === "deletion" && <label className="check"><input type="checkbox" name="confirm" /> I have confirmed this request with the customer. Delete their account and anonymise their records (cannot be undone).</label>}
              <div className="row">
                {r.kind === "deletion"
                  ? <><input type="hidden" name="op" value="complete" /><ConfirmButton message="Delete this customer's account and anonymise their records? This cannot be undone." className="btn btn-danger btn-sm">Delete &amp; anonymise</ConfirmButton></>
                  : <button className="btn btn-primary btn-sm" name="op" value="complete">Mark as completed</button>}
              </div>
            </form>
          )}
          {r.status === "pending" && (
            <form action={processDataRequest}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="op" value="reject" /><button className="link-btn small">Decline request</button></form>
          )}
        </article>
      ))}
    </div>
  );
}

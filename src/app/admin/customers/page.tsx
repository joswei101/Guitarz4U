import Link from "next/link";
import { query } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { Empty } from "@/components/ui";

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const rows = await query<{ id: string; name: string; email: string; role: string; emailVerified: boolean; createdAt: Date; deletedAt: Date | null; requests: number; repairs: number; submissions: number }>(
    `select u.id, u.name, u.email, u.role, u."emailVerified", u."createdAt", u."deletedAt",
       (select count(*)::int from purchase_requests where user_id=u.id) requests,
       (select count(*)::int from repair_bookings where user_id=u.id) repairs,
       (select count(*)::int from seller_submissions where user_id=u.id) submissions
     from "user" u where ($1='' or u.name ilike '%'||$1||'%' or u.email ilike '%'||$1||'%')
     order by u."createdAt" desc limit 300`,
    [q],
  );
  return (
    <div className="stack">
      <h1 style={{ fontSize: "2rem" }}>Customer accounts</h1>
      <form className="row" action="/admin/customers">
        <label className="sr-only" htmlFor="q">Search customers</label>
        <input id="q" name="q" className="input" defaultValue={q} placeholder="Search name or email" style={{ maxWidth: 320 }} />
        <button className="btn btn-outline btn-sm">Search</button>
      </form>
      {rows.length === 0 ? <Empty title="No accounts found" /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th className="num">Requests</th><th className="num">Submissions</th><th className="num">Repairs</th></tr></thead>
          <tbody>{rows.map((u) => (
            <tr key={u.id}>
              <td><Link href={`/admin/customers/${u.id}`}>{u.name}</Link>{u.deletedAt && <span className="tag tag-bad" style={{ marginLeft: 6 }}>Deleted</span>}</td>
              <td>{u.email}{!u.emailVerified && !u.deletedAt && <div className="small muted">not verified</div>}</td>
              <td>{u.role === "admin" ? <span className="tag tag-dark">Admin</span> : "Customer"}</td>
              <td>{formatDate(u.createdAt)}</td>
              <td className="num">{u.requests}</td><td className="num">{u.submissions}</td><td className="num">{u.repairs}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <p className="small muted">Administrator access cannot be granted from the website. Use the documented <code>npm run admin:create</code> command (docs/SETUP.md).</p>
    </div>
  );
}

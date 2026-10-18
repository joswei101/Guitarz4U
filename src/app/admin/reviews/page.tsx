import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Stars, StatusBadge, Empty } from "@/components/ui";
import { moderateReview } from "../actions";

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const sp = await searchParams;
  const all = sp.all === "1";
  const rows = await query<{ id: string; display_name: string; email: string | null; rating: number; title: string; body: string; status: string; verified_purchase: boolean; created_at: Date; moderation_note: string; reports: { reason: string; created_at: string }[] | null }>(
    `select r.id, r.display_name, u.email, r.rating, r.title, r.body, r.status, r.verified_purchase, r.created_at, r.moderation_note,
       (select json_agg(json_build_object('reason', rr.reason, 'created_at', rr.created_at)) from review_reports rr where rr.review_id=r.id and rr.resolved_at is null) reports
     from reviews r left join "user" u on u.id=r.user_id
     where $1 or r.status='pending' or exists (select 1 from review_reports rr where rr.review_id=r.id and rr.resolved_at is null)
     order by (r.status='pending') desc, r.created_at desc limit 200`,
    [all],
  );
  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Reviews</h1>
        <a className="btn btn-ghost btn-sm" href={all ? "/admin/reviews" : "/admin/reviews?all=1"}>{all ? "Show items needing action" : "Show all reviews"}</a>
      </div>
      <p className="muted">Reviews only appear on the website after you approve them. Never publish reviews you did not receive from real customers.</p>
      {rows.length === 0 ? <Empty title="Nothing to moderate" /> : rows.map((r) => (
        <article key={r.id} className="card stack">
          <div className="row between">
            <span><Stars rating={r.rating} /> <strong>{r.title}</strong></span>
            <StatusBadge status={r.status} label={r.status} />
          </div>
          <p className="pre-line" style={{ margin: 0 }}>{r.body}</p>
          <p className="small muted" style={{ margin: 0 }}>{r.display_name} · {r.email ?? "account deleted"} · {formatDateTime(r.created_at)}{r.verified_purchase ? " · completed purchase on record" : ""}</p>
          {r.reports && <div className="notice notice-bad"><strong>Reported ({r.reports.length})</strong>{r.reports.map((x, i) => <p key={i}>“{x.reason}”</p>)}</div>}
          <form action={moderateReview} className="row">
            <input type="hidden" name="id" value={r.id} />
            <label className="sr-only" htmlFor={`note-${r.id}`}>Note</label>
            <input id={`note-${r.id}`} name="note" className="input" placeholder="Reason / note (optional, sent if rejected)" defaultValue={r.moderation_note} style={{ maxWidth: 320 }} />
            {r.status !== "approved" && <button className="btn btn-primary btn-sm" name="op" value="approved">Approve</button>}
            {r.status === "pending" && <button className="btn btn-outline btn-sm" name="op" value="rejected">Reject</button>}
            {r.status === "approved" && <button className="btn btn-danger btn-sm" name="op" value="removed">Remove</button>}
            {r.status === "approved" && r.reports && <button className="btn btn-ghost btn-sm" name="op" value="approved">Keep &amp; dismiss reports</button>}
          </form>
        </article>
      ))}
    </div>
  );
}

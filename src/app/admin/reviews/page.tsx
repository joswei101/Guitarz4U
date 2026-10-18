import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminTitle } from "@/components/admin/AdminUi";
import { ReviewModeration } from "@/components/admin/ReviewModeration";
import { Stars } from "@/components/ui/Stars";
import { StatusBadge } from "@/components/ui/Badges";
import { REVIEW_STATUSES, statusLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Reviews" };

export default async function AdminReviews({ searchParams }: PageProps<"/admin/reviews">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && REVIEW_STATUSES.some((s) => s.value === sp.status) ? sp.status : "pending";
  const supabase = await createClient();
  const [{ data }, reports] = await Promise.all([
    supabase.from("reviews").select("*").eq("status", status).order("created_at", { ascending: false }).limit(100),
    supabase.from("review_reports").select("id, review_id, reason, created_at").eq("resolved", false),
  ]);
  const reportsFor = (id: string) => (reports.data ?? []).filter((r) => r.review_id === id);
  const reportedIds = new Set((reports.data ?? []).map((r) => r.review_id));
  return (
    <div>
      <AdminTitle title="Reviews">All reviews need your approval before they appear on the website.</AdminTitle>
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Review status">
        {REVIEW_STATUSES.map((s) => (
          <Link key={s.value} href={`/admin/reviews?status=${s.value}`} className={`btn btn-sm ${s.value === status ? "btn-primary" : "btn-ghost"}`}>{s.label}</Link>
        ))}
      </nav>
      {reportedIds.size > 0 && <p className="mb-4 text-sm font-semibold text-danger">{reportedIds.size} review(s) have open reports from visitors — check the Published tab.</p>}
      <ul className="space-y-3">
        {(data ?? []).map((r) => (
          <li key={r.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-3"><Stars rating={r.rating} /> <strong>{r.display_name}</strong> {r.verified_purchase && <span className="badge badge-success">Verified purchase</span>}</span>
              <StatusBadge status={r.status} label={statusLabel(REVIEW_STATUSES, r.status)} />
            </div>
            {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
            <p className="mt-1 whitespace-pre-line text-sm">{r.body}</p>
            <p className="mt-2 text-xs text-tan">{formatDateTime(r.created_at)}{r.user_id && <> · <Link href={`/admin/customers/${r.user_id}`} className="link">reviewer account</Link></>}</p>
            {reportsFor(r.id).length > 0 && (
              <div className="mt-3 rounded bg-[#f8e2de] p-3 text-sm">
                <p className="font-semibold text-danger">Reported:</p>
                <ul className="list-disc pl-5">{reportsFor(r.id).map((x) => <li key={x.id}>{x.reason}</li>)}</ul>
              </div>
            )}
            <ReviewModeration id={r.id} status={r.status} hasReports={reportsFor(r.id).length > 0} />
          </li>
        ))}
        {!data?.length && <li className="card p-6 text-center text-tan">No reviews in this list.</li>}
      </ul>
    </div>
  );
}

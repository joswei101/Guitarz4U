import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { StatusBadge } from "@/components/ui/Badge";
import { Stars } from "@/components/reviews/ReviewCard";
import { moderateReviewAction, resolveReportAction } from "@/app/admin/actions";
import { formatDateTime } from "@/lib/format";
import { REVIEW_STATUS_LABELS, type ReviewStatus } from "@/lib/constants";

export const metadata = { title: "Reviews" };

export default async function AdminReviews() {
  const supabase = await createClient();
  const [{ data: reviews }, { data: reports }] = await Promise.all([
    supabase.from("reviews").select("id, reviewer_name, rating, title, body, status, is_verified_buyer, created_at, moderated_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("review_reports").select("id, reason, created_at, review:reviews(id, title, reviewer_name)").eq("resolved", false).order("created_at", { ascending: false }),
  ]);
  const rows = (reviews ?? []) as { id: string; reviewer_name: string; rating: number; title: string; body: string; status: ReviewStatus; is_verified_buyer: boolean; created_at: string }[];
  const openReports = (reports ?? []) as unknown as { id: string; reason: string; created_at: string; review: { id: string; title: string; reviewer_name: string } | null }[];
  const pending = rows.filter((r) => r.status === "pending");
  const others = rows.filter((r) => r.status !== "pending");

  const Actions = ({ r }: { r: (typeof rows)[number] }) => (
    <div className="flex flex-wrap gap-2">
      {(["approved", "rejected", "removed"] as const)
        .filter((s) => s !== r.status)
        .map((s) => (
          <form key={s} action={moderateReviewAction}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="status" value={s} />
            <button className={`btn btn-sm ${s === "approved" ? "btn-primary" : "btn-outline"}`}>{s === "approved" ? "Approve & publish" : s === "rejected" ? "Reject" : "Remove"}</button>
          </form>
        ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Reviews"
        description="Every review needs your approval before it appears publicly. Never edit or write reviews on behalf of customers. 'Verified buyer' is set automatically only if the reviewer has a completed purchase."
      />
      {openReports.length > 0 && (
        <section className="card border-danger/40 p-5">
          <h2 className="text-xl">Reported reviews</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {openReports.map((rep) => (
              <li key={rep.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{rep.review?.title ?? "Deleted review"} — by {rep.review?.reviewer_name}</p>
                  <p className="text-ink-soft">Reason: {rep.reason}</p>
                  <p className="text-xs text-ink-soft">{formatDateTime(rep.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  {rep.review && (
                    <form action={moderateReviewAction}>
                      <input type="hidden" name="id" value={rep.review.id} />
                      <input type="hidden" name="status" value="removed" />
                      <button className="btn btn-danger btn-sm">Remove review</button>
                    </form>
                  )}
                  <form action={resolveReportAction}>
                    <input type="hidden" name="id" value={rep.id} />
                    <button className="btn btn-outline btn-sm">Dismiss report</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-xl">Awaiting moderation ({pending.length})</h2>
        {pending.length ? (
          <ul className="space-y-3">
            {pending.map((r) => (
              <li key={r.id} className="card space-y-2 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars rating={r.rating} />
                  <strong>{r.title}</strong>
                  {r.is_verified_buyer && <span className="badge badge-success">Verified buyer</span>}
                </div>
                <p className="whitespace-pre-line text-sm">{r.body}</p>
                <p className="text-xs text-ink-soft">
                  {r.reviewer_name} · {formatDateTime(r.created_at)}
                </p>
                <Actions r={r} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-6 text-center text-ink-soft">Nothing to moderate.</p>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-xl">Moderated</h2>
        <ul className="space-y-3">
          {others.map((r) => (
            <li key={r.id} className="card flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars rating={r.rating} /> <strong>{r.title}</strong> <StatusBadge status={r.status} label={REVIEW_STATUS_LABELS[r.status]} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{r.body}</p>
                <p className="text-xs text-ink-soft">{r.reviewer_name} · {formatDateTime(r.created_at)}</p>
              </div>
              <Actions r={r} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "@/components/forms/ReviewForm";
import { StatusBadge } from "@/components/ui/Badges";
import { Stars } from "@/components/ui/Stars";
import { ActionButton } from "@/components/account/ActionButton";
import { deletePendingReview } from "@/app/actions/account";
import { REVIEW_STATUSES, statusLabel } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const metadata = { title: "My reviews" };

export default async function MyReviewsPage() {
  const { user, profile } = await requireUser("/account/reviews");
  const supabase = await createClient();
  const { data } = await supabase.from("reviews").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return (
    <div className="space-y-8">
      <section className="card p-6">
        <h2 className="text-2xl">Write a review</h2>
        <div className="mt-4">
          <ReviewForm defaultName={profile?.full_name?.split(" ")[0] ?? ""} />
        </div>
      </section>
      {data && data.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl">Your reviews</h2>
          <ul className="space-y-3">
            {data.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Stars rating={r.rating} />
                  <StatusBadge status={r.status} label={statusLabel(REVIEW_STATUSES, r.status)} />
                </div>
                {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                <p className="mt-1 whitespace-pre-line text-sm">{r.body}</p>
                <p className="mt-2 text-xs text-tan">{formatDate(r.created_at)}</p>
                {r.rejection_reason && <p className="mt-1 text-sm text-danger">Reason: {r.rejection_reason}</p>}
                {r.status === "pending" && (
                  <div className="mt-2">
                    <ActionButton action={deletePendingReview.bind(null, r.id)} confirm="Delete this review?" className="btn btn-ghost btn-sm text-danger">
                      Delete
                    </ActionButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

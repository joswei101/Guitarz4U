import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/content/PageHeader";
import { ReviewCard, Stars } from "@/components/reviews/ReviewCard";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { getApprovedReviews } from "@/lib/data/reviews";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { REVIEW_STATUS_LABELS, type ReviewStatus } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Customer reviews",
  description: "Read genuine, moderated customer reviews of Guitarz4U, or share your own experience.",
  alternates: { canonical: "/reviews" },
};

export default async function ReviewsPage() {
  const [reviews, user] = await Promise.all([getApprovedReviews(100), getUser()]);
  let myReviews: { id: string; title: string; status: ReviewStatus; created_at: string }[] = [];
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("reviews")
      .select("id, title, status, created_at")
      .eq("user_id", user.id)
      .neq("status", "approved")
      .order("created_at", { ascending: false });
    myReviews = (data ?? []) as typeof myReviews;
  }
  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <>
      <PageHeader eyebrow="Reviews" title="What our customers say">
        <p>
          Every review is written by a registered customer and checked by us before it&apos;s published. We never write,
          buy or edit reviews.
        </p>
      </PageHeader>
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_24rem]">
        <section aria-labelledby="published-heading">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 id="published-heading" className="text-2xl">
              Published reviews
            </h2>
            {reviews.length > 0 && (
              <p className="flex items-center gap-2 text-sm text-ink-soft">
                <Stars rating={Math.round(average)} /> {average.toFixed(1)} average from {reviews.length} review
                {reviews.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
          {reviews.length ? (
            <ul className="grid gap-5 md:grid-cols-2">
              {reviews.map((r) => (
                <li key={r.id}>
                  <ReviewCard review={r} showReport />
                </li>
              ))}
            </ul>
          ) : (
            <p className="card p-8 text-center text-ink-soft">
              There are no published reviews yet. If you&apos;ve bought, sold or had a guitar repaired with us, we&apos;d love
              to hear from you.
            </p>
          )}
          <p className="mt-6 text-xs text-ink-soft">
            &ldquo;Verified buyer&rdquo; is shown only when the reviewer&apos;s account has a purchase that Guitarz4U marked
            as completed.
          </p>
        </section>
        <aside className="space-y-4">
          <div className="card p-6">
            <h2 className="text-xl">Write a review</h2>
            {user ? (
              <>
                <p className="mt-1 text-sm text-ink-soft">Reviews are published after moderation.</p>
                <div className="mt-4">
                  <ReviewForm />
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">
                Please{" "}
                <Link href="/login?next=/reviews" className="font-semibold text-gold-ink">
                  sign in
                </Link>{" "}
                or{" "}
                <Link href="/register?next=/reviews" className="font-semibold text-gold-ink">
                  create an account
                </Link>{" "}
                to write a review.
              </p>
            )}
          </div>
          {myReviews.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg">Your reviews</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {myReviews.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{r.title}</span>
                    <span className="badge badge-neutral">{REVIEW_STATUS_LABELS[r.status]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      {reviews.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "MusicStore",
            name: "Guitarz4U",
            url: SITE_URL,
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: average.toFixed(1),
              reviewCount: reviews.length,
            },
          }}
        />
      )}
    </>
  );
}

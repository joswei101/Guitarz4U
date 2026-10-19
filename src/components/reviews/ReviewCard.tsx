import { StarIcon } from "@/components/ui/Icons";
import { formatDate } from "@/lib/format";
import type { PublicReview } from "@/lib/data/reviews";
import { ReportReviewButton } from "@/components/reviews/ReportReviewButton";

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex text-gold" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= rating} className="h-4 w-4" />
      ))}
    </span>
  );
}

export function ReviewCard({ review, showReport = false }: { review: PublicReview; showReport?: boolean }) {
  return (
    <article className="card flex h-full flex-col gap-3 p-6">
      <Stars rating={review.rating} />
      <h3 className="text-lg">{review.title}</h3>
      <p className="whitespace-pre-line text-ink-soft">{review.body}</p>
      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-sm">
        <span className="font-semibold text-walnut">
          {review.reviewer_name}
          {review.is_verified_buyer && (
            <span className="badge badge-success ml-2" title="This account has a completed purchase with Guitarz4U">
              Verified buyer
            </span>
          )}
        </span>
        <span className="text-ink-soft">{formatDate(review.created_at)}</span>
      </footer>
      {showReport && <ReportReviewButton reviewId={review.id} />}
    </article>
  );
}

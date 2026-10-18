import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stars } from "@/components/ui/Stars";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { ReportReview } from "@/components/shop/ReportReview";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Customer reviews",
  description: "Reviews from registered Guitarz4U customers. All reviews are moderated before publication.",
  alternates: { canonical: "/reviews" },
};

const PER_PAGE = 12;

export default async function ReviewsPage({ searchParams }: PageProps<"/reviews">) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const [user, list, all] = await Promise.all([
    getUser(),
    supabase
      .from("public_reviews")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1),
    supabase.from("public_reviews").select("rating"),
  ]);
  const reviews = list.data ?? [];
  const ratings = (all.data ?? []).map((r) => r.rating ?? 0);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  return (
    <>
      <PageHeader eyebrow="Reviews" title="Customer reviews">
        Reviews come from registered customers and are checked before they&apos;re published. &ldquo;Verified
        purchase&rdquo; appears only when the reviewer has a completed purchase with us.
      </PageHeader>
      <div className="container-page py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          {ratings.length > 0 ? (
            <div className="flex items-center gap-3">
              <span className="font-display text-4xl">{avg.toFixed(1)}</span>
              <div>
                <Stars rating={Math.round(avg)} size="h-5 w-5" />
                <p className="text-sm text-tan">
                  Based on {ratings.length} review{ratings.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          ) : (
            <span />
          )}
          <Link href="/account/reviews" className="btn btn-primary">
            Write a review
          </Link>
        </div>
        {reviews.length ? (
          <>
            <ul className="grid gap-5 md:grid-cols-2">
              {reviews.map((r) => (
                <li key={r.id} className="card p-6">
                  <Stars rating={r.rating ?? 0} />
                  {r.title && <h2 className="mt-2 text-xl">{r.title}</h2>}
                  <p className="mt-2 whitespace-pre-line">{r.body}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-tan">
                      {r.display_name} · {formatDate(r.created_at)}
                      {r.verified_purchase && <span className="badge badge-success ml-2">Verified purchase</span>}
                    </p>
                    <ReportReview reviewId={r.id!} signedIn={Boolean(user)} />
                  </div>
                </li>
              ))}
            </ul>
            <Pagination page={page} totalPages={Math.ceil((list.count ?? 0) / PER_PAGE)} makeHref={(p) => `/reviews?page=${p}`} />
          </>
        ) : (
          <EmptyState title="No reviews yet" action={{ href: "/account/reviews", label: "Be the first to review us" }}>
            Bought, sold or had a guitar repaired with us? We&apos;d love to hear about it.
          </EmptyState>
        )}
      </div>
    </>
  );
}

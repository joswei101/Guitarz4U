import type { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { PageHead, Stars, Empty } from "@/components/ui";
import { ReviewForm, ReportButton } from "./ReviewClient";

export const metadata: Metadata = {
  title: "Customer reviews",
  description: "Reviews of Guitarz4U from real customers. Every review is moderated before it is published.",
  alternates: { canonical: "/reviews" },
};
export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const [reviews, user] = await Promise.all([
    query<{ id: string; display_name: string; rating: number; title: string; body: string; verified_purchase: boolean; created_at: Date }>(
      "select id, display_name, rating, title, body, verified_purchase, created_at from reviews where status='approved' order by created_at desc limit 100",
    ),
    getCurrentUser(),
  ]);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return (
    <>
      <PageHead
        title="Customer reviews"
        eyebrow="From our customers"
        intro="All reviews are written by registered customers and checked by us before they are published. “Completed purchase” means our records show a completed sale for that account."
        crumbs={[{ label: "Reviews" }]}
      />
      <div className="wrap section-tight detail-grid">
        <section aria-labelledby="list-h">
          <h2 id="list-h" className="sr-only">Reviews</h2>
          {reviews.length > 0 && (
            <p className="lead"><Stars rating={Math.round(avg)} /> {avg.toFixed(1)} out of 5 from {reviews.length} review{reviews.length === 1 ? "" : "s"}</p>
          )}
          {reviews.length === 0 ? (
            <Empty title="No reviews yet">
              <p className="muted">We only publish genuine reviews from real customers. Be the first to share your experience.</p>
            </Empty>
          ) : (
            <div className="stack">
              {reviews.map((r) => (
                <article key={r.id} className="card review">
                  <div className="row between">
                    <Stars rating={r.rating} />
                    <span className="small muted">{formatDate(r.created_at)}</span>
                  </div>
                  {r.title && <h3 style={{ marginTop: 8 }}>{r.title}</h3>}
                  <p className="pre-line">{r.body}</p>
                  <div className="row between">
                    <span className="small"><strong>{r.display_name}</strong>{r.verified_purchase && <span className="tag tag-good" style={{ marginLeft: 8 }}>Completed purchase</span>}</span>
                    <ReportButton reviewId={r.id} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <aside>
          {user ? (
            <ReviewForm defaultName={user.name.split(" ")[0]} />
          ) : (
            <div className="card">
              <h2 style={{ fontSize: "1.3rem" }}>Write a review</h2>
              <p>Reviews can be written by registered customers. This helps us keep reviews genuine.</p>
              <div className="row">
                <Link href="/login?next=/reviews" className="btn btn-primary">Log in</Link>
                <Link href="/register" className="btn btn-outline">Create account</Link>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

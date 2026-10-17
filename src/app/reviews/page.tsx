import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { Card, EmptyState, PageHeader, Stars } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { fmtDate } from "@/components/status-badges";

export const metadata: Metadata = { title: "Customer reviews", description: "Genuine, moderated reviews from Guitarz4U customers.", alternates: { canonical: "/reviews" } };

export default async function ReviewsPage() {
  const [reviews, user] = await Promise.all([
    prisma.review.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, include: { product: { select: { title: true, slug: true } } }, take: 100 }),
    getCurrentUser(),
  ]);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return (
    <>
      <PageHeader eyebrow="Customers" title="Reviews">
        Every review comes from a registered customer and is checked by the owner before it&apos;s published. We never write or edit reviews ourselves.
      </PageHeader>
      <div className="container grid gap-8 py-10 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {reviews.length === 0 && <EmptyState title="No reviews published yet">Be one of the first to share your experience.</EmptyState>}
          {reviews.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-center justify-between gap-2"><Stars rating={r.rating} /><span className="text-xs text-bone-dim">{fmtDate(r.createdAt)}</span></div>
              {r.title && <p className="mt-2 font-semibold text-bone">{r.title}</p>}
              <p className="mt-2 whitespace-pre-line text-bone-muted">{r.body}</p>
              <p className="mt-3 text-xs text-bone-dim">— {r.displayName}{r.isVerifiedPurchase ? (r.subject === "REPAIR" ? " · Verified repair customer" : " · Verified purchase") : ""}{r.product && <> · <Link href={`/shop/${r.product.slug}`} className="link">{r.product.title}</Link></>}</p>
            </Card>
          ))}
        </div>
        <aside id="write" className="space-y-4">
          {reviews.length > 0 && <Card><p className="font-display text-4xl text-amp">{avg.toFixed(1)}</p><Stars rating={Math.round(avg)} /><p className="mt-1 text-sm text-bone-muted">{reviews.length} published review{reviews.length === 1 ? "" : "s"}</p></Card>}
          <Card className="space-y-3">
            <p className="font-display text-lg uppercase">Share your experience</p>
            <p className="text-sm text-bone-muted">Reviews can be written by registered customers with a verified email address.</p>
            <ButtonLink href={user ? "/account/reviews" : "/login?next=/account/reviews"} className="w-full">Write a review</ButtonLink>
          </Card>
        </aside>
      </div>
    </>
  );
}

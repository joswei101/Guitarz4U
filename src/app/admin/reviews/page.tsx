import type { ModerationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { moderateReviewAction } from "@/app/actions/admin/misc";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Badge, Card, EmptyState, Stars } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/components/status-badges";
import Link from "next/link";

export const metadata = { title: "Reviews" };

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePermissionPage("reviews:moderate");
  const { status = "PENDING" } = await searchParams;
  const reviews = await prisma.review.findMany({ where: { status: status as ModerationStatus }, orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { name: true, email: true } }, product: { select: { title: true } } } });
  return (
    <div className="max-w-4xl space-y-4">
      <AdminHeader title="Review moderation" />
      <nav className="flex gap-3 text-sm">{["PENDING", "APPROVED", "REJECTED", "REMOVED"].map((s) => <Link key={s} href={`/admin/reviews?status=${s}`} className={s === status ? "text-amp" : "text-bone-muted hover:text-amp"}>{s.toLowerCase()}</Link>)}</nav>
      <p className="text-xs text-bone-dim">Only approved reviews are public. Never edit a review&apos;s wording — approve, reject or remove it. Reject spam, abuse, personal information or content that isn&apos;t about a genuine experience.</p>
      {reviews.length === 0 && <EmptyState title="Nothing here" />}
      {reviews.map((r) => (
        <Card key={r.id} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2"><Stars rating={r.rating} /><Badge>{r.subject.toLowerCase()}</Badge>{r.isVerifiedPurchase && <Badge tone="ok">verified</Badge>}<span className="text-xs text-bone-dim">{fmtDate(r.createdAt, true)}</span></div>
          {r.title && <p className="font-semibold">{r.title}</p>}
          <p className="whitespace-pre-line text-sm text-bone-muted">{r.body}</p>
          <p className="text-xs text-bone-dim">Shown as “{r.displayName}” · account {r.user.name} ({r.user.email}){r.product ? ` · ${r.product.title}` : ""}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {(["APPROVED", "REJECTED", "REMOVED"] as const).filter((s) => s !== r.status).map((s) => (
              <form key={s} action={moderateReviewAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value={s} /><Button size="sm" variant={s === "APPROVED" ? "primary" : "outline"}>{s === "APPROVED" ? "Approve & publish" : s === "REJECTED" ? "Reject" : "Remove"}</Button></form>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

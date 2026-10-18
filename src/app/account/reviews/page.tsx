import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { submitReviewAction } from "@/app/actions/account";
import { PAID_STATUSES } from "@/lib/shop/order-status";
import { Alert, Badge, Card, Stars } from "@/components/ui/misc";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/components/forms/action-form";
import { fmtDate } from "@/components/status-badges";

export const metadata = { title: "My reviews" };

export default async function MyReviews() {
  const user = await requireUserPage("/account/reviews");
  const [mine, bought, repairs] = await Promise.all([
    prisma.review.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { product: { select: { title: true } } } }),
    prisma.orderItem.findMany({ where: { order: { userId: user.id, status: { in: PAID_STATUSES } } }, select: { productId: true, title: true }, distinct: ["productId"] }),
    prisma.repairRequest.findMany({ where: { userId: user.id, status: { in: ["COLLECTED", "PAID", "READY_FOR_COLLECTION"] } }, select: { id: true, reference: true, instrumentType: true } }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">Reviews</h1>
      <Card>
        <h2 className="font-display text-xl uppercase">Write a review</h2>
        <p className="mt-1 text-sm text-bone-muted">Reviews are checked by the owner before they are published. Please keep them honest and don&apos;t include personal information.</p>
        {!user.emailVerifiedAt ? <Alert tone="warn" className="mt-4">Verify your email address to write reviews.</Alert> : (
          <ActionForm action={submitReviewAction} submitLabel="Submit review" hideOnSuccess className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="What are you reviewing?" htmlFor="subject" required>
              <Select id="subject" name="subject" defaultValue="GENERAL">
                <option value="GENERAL">My overall experience</option>
                {bought.length > 0 && <option value="PRODUCT">An item I bought</option>}
                {repairs.length > 0 && <option value="REPAIR">A repair</option>}
              </Select>
            </Field>
            {bought.length > 0 && (
              <Field label="Item (if reviewing an item)" htmlFor="productId">
                <Select id="productId" name="productId"><option value="">—</option>{bought.map((b) => <option key={b.productId} value={b.productId}>{b.title}</option>)}</Select>
              </Field>
            )}
            {repairs.length > 0 && (
              <Field label="Repair (if reviewing a repair)" htmlFor="repairId">
                <Select id="repairId" name="repairId"><option value="">—</option>{repairs.map((r) => <option key={r.id} value={r.id}>{r.reference} · {r.instrumentType}</option>)}</Select>
              </Field>
            )}
            <Field label="Rating" htmlFor="rating" required>
              <Select id="rating" name="rating" defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}</Select>
            </Field>
            <Field label="Name to display" htmlFor="displayName" required hint="e.g. your first name and initial">
              <Input id="displayName" name="displayName" defaultValue={`${user.name.split(" ")[0]} ${user.name.split(" ")[1]?.[0] ?? ""}`.trim()} required maxLength={60} />
            </Field>
            <Field label="Title (optional)" htmlFor="title" className="sm:col-span-2"><Input id="title" name="title" maxLength={120} /></Field>
            <Field label="Your review" htmlFor="body" required className="sm:col-span-2"><Textarea id="body" name="body" required minLength={20} maxLength={3000} /></Field>
          </ActionForm>
        )}
      </Card>
      <Card>
        <h2 className="font-display text-xl uppercase">Your reviews</h2>
        {mine.length === 0 ? <p className="mt-2 text-sm text-bone-muted">You haven&apos;t written any reviews yet.</p> : (
          <ul className="mt-3 divide-y divide-ink-500">
            {mine.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <div className="flex items-center gap-2"><Stars rating={r.rating} /><Badge tone={r.status === "APPROVED" ? "ok" : r.status === "PENDING" ? "warn" : "danger"}>{r.status === "PENDING" ? "Awaiting approval" : r.status.toLowerCase()}</Badge></div>
                <p className="mt-1 text-bone">{r.title ?? r.product?.title ?? "General review"}</p>
                <p className="text-bone-muted">{r.body}</p>
                <p className="text-xs text-bone-dim">{fmtDate(r.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

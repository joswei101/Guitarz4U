import Link from "next/link";
import type { ModerationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { answerQuestionAction, moderateQuestionAction } from "@/app/actions/admin/misc";
import { AdminHeader } from "@/components/admin/admin-ui";
import { ActionForm } from "@/components/forms/action-form";
import { Card, EmptyState } from "@/components/ui/misc";
import { Checkbox, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/components/status-badges";

export const metadata = { title: "Product questions" };

export default async function AdminQuestions({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requirePermissionPage("questions:answer");
  const { status = "PENDING" } = await searchParams;
  const qs = await prisma.productQuestion.findMany({ where: { status: status as ModerationStatus }, orderBy: { createdAt: "desc" }, take: 100, include: { product: { select: { title: true, slug: true, id: true } }, user: { select: { name: true } } } });
  const publisher = can(user.role, "questions:publish");
  return (
    <div className="max-w-4xl space-y-4">
      <AdminHeader title="Product questions" />
      <nav className="flex gap-3 text-sm">{["PENDING", "APPROVED", "REJECTED", "REMOVED"].map((s) => <Link key={s} href={`/admin/questions?status=${s}`} className={s === status ? "text-amp" : "text-bone-muted hover:text-amp"}>{s === "APPROVED" ? "published" : s.toLowerCase()}</Link>)}</nav>
      {qs.length === 0 && <EmptyState title="No questions here" />}
      {qs.map((q) => (
        <Card key={q.id} className="space-y-3">
          <p className="text-xs text-bone-dim"><Link className="link" href={`/admin/products/${q.product.id}`}>{q.product.title}</Link> · {q.user.name} · {fmtDate(q.createdAt, true)}</p>
          <p className="font-semibold">Q: {q.question}</p>
          <ActionForm action={answerQuestionAction} submitLabel="Save answer" variant="subtle" className="space-y-2">
            <input type="hidden" name="id" value={q.id} />
            <Textarea name="answer" defaultValue={q.answer ?? ""} aria-label="Answer" required />
            {publisher ? <Checkbox id={`pub-${q.id}`} name="publish" defaultChecked label="Publish on the product page and notify the customer" /> : <p className="text-xs text-bone-dim">The owner will review and publish your answer.</p>}
          </ActionForm>
          {publisher && (
            <div className="flex gap-2">
              {q.answer && q.status !== "APPROVED" && <form action={moderateQuestionAction}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="status" value="APPROVED" /><Button size="sm">Publish</Button></form>}
              {q.status !== "REJECTED" && <form action={moderateQuestionAction}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="status" value="REJECTED" /><Button size="sm" variant="outline">Reject (spam/abuse)</Button></form>}
              {q.status === "APPROVED" && <form action={moderateQuestionAction}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="status" value="REMOVED" /><Button size="sm" variant="ghost">Unpublish</Button></form>}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

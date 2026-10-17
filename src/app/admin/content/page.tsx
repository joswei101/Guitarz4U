import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { PAGE_DEFS } from "@/lib/content";
import { decideBannerAction, deleteFaqAction, saveBannerAction, saveFaqAction } from "@/app/actions/admin/content";
import { AdminHeader, Table } from "@/components/admin/admin-ui";
import { ActionForm } from "@/components/forms/action-form";
import { Badge, Card } from "@/components/ui/misc";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/components/status-badges";

export const metadata = { title: "Website content" };

export default async function ContentAdmin() {
  const user = await requirePermissionPage("content:draft");
  const publisher = can(user.role, "content:publish");
  const [pages, faqs, banners] = await Promise.all([prisma.page.findMany(), prisma.faq.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] }), prisma.banner.findMany({ orderBy: { sortOrder: "asc" } })]);
  const live = banners.find((b) => b.status === "PUBLISHED");
  return (
    <div className="max-w-5xl space-y-6">
      <AdminHeader title="Website content" />
      <p className="text-sm text-bone-muted">Featured products are set on each product (“Feature on the homepage”). {publisher ? "Changes you publish go live immediately." : "Your changes are submitted to the owner for approval before going live."}</p>
      <Card>
        <h2 className="font-display text-lg uppercase">Pages & policies</h2>
        <div className="mt-3"><Table>
          <thead><tr><th>Page</th><th>Last published</th><th>Status</th></tr></thead>
          <tbody>{PAGE_DEFS.map((d) => { const p = pages.find((x) => x.slug === d.slug); return (
            <tr key={d.slug}><td><Link className="link" href={`/admin/content/${d.slug}`}>{p?.title ?? d.title}</Link></td><td>{fmtDate(p?.publishedAt)}</td><td className="space-x-1">{p?.draftStatus === "PENDING_APPROVAL" && <Badge tone="warn">draft awaiting approval</Badge>}{d.requiresLegalReview && <Badge tone="info">needs legal review</Badge>}</td></tr>
          ); })}</tbody>
        </Table></div>
      </Card>
      <Card className="space-y-4">
        <h2 className="font-display text-lg uppercase">Homepage hero banner</h2>
        <ActionForm action={saveBannerAction} submitLabel={publisher ? "Update banner" : "Propose change"} className="space-y-3">
          {live && <input type="hidden" name="id" value={live.id} />}
          <Field label="Heading" htmlFor="heading" required><Input id="heading" name="heading" defaultValue={live?.heading} required /></Field>
          <Field label="Subheading" htmlFor="subheading"><Textarea id="subheading" name="subheading" defaultValue={live?.subheading ?? ""} className="min-h-16" /></Field>
        </ActionForm>
        {banners.filter((b) => b.status === "PENDING_APPROVAL").map((b) => (
          <div key={b.id} className="rounded-lg border border-yellow-500/40 p-3 text-sm">
            <p><Badge tone="warn">proposed</Badge> <strong>{b.heading}</strong> — {b.subheading}</p>
            {publisher && <div className="mt-2 flex gap-2">
              <form action={decideBannerAction}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="decision" value="approve" /><Button size="sm">Approve & publish</Button></form>
              <form action={decideBannerAction}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="decision" value="reject" /><Button size="sm" variant="ghost">Reject</Button></form>
            </div>}
          </div>
        ))}
      </Card>
      <Card className="space-y-4">
        <h2 className="font-display text-lg uppercase">FAQs</h2>
        {faqs.map((f) => (
          <details key={f.id} className="rounded-lg border border-ink-500 p-3">
            <summary className="cursor-pointer text-sm"><Badge tone={f.status === "PUBLISHED" ? "ok" : "warn"}>{f.status.toLowerCase().replace("_", " ")}</Badge> <span className="text-bone-dim">{f.category}</span> · {f.question}</summary>
            <ActionForm action={saveFaqAction} submitLabel="Save FAQ" variant="subtle" className="mt-3 space-y-3">
              <input type="hidden" name="id" value={f.id} />
              <FaqFields f={f} publisher={publisher} />
            </ActionForm>
            {publisher && <form action={deleteFaqAction} className="mt-2"><input type="hidden" name="id" value={f.id} /><button className="text-xs text-danger underline">Delete</button></form>}
          </details>
        ))}
        <details className="rounded-lg border border-dashed border-ink-400 p-3">
          <summary className="cursor-pointer text-sm text-amp">+ Add FAQ</summary>
          <ActionForm action={saveFaqAction} submitLabel="Add FAQ" className="mt-3 space-y-3"><FaqFields publisher={publisher} /></ActionForm>
        </details>
      </Card>
    </div>
  );
}

function FaqFields({ f, publisher }: { f?: { id: string; question: string; answer: string; category: string; sortOrder: number; status: string }; publisher: boolean }) {
  const k = f?.id ?? "new";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_90px]">
        <Field label="Question" htmlFor={`q-${k}`} required><Input id={`q-${k}`} name="question" defaultValue={f?.question} required /></Field>
        <Field label="Category" htmlFor={`c-${k}`} required><Input id={`c-${k}`} name="category" defaultValue={f?.category ?? "General"} required /></Field>
        <Field label="Order" htmlFor={`s-${k}`}><Input id={`s-${k}`} name="sortOrder" type="number" defaultValue={f?.sortOrder ?? 0} /></Field>
      </div>
      <Field label="Answer" htmlFor={`a-${k}`} required><Textarea id={`a-${k}`} name="answer" defaultValue={f?.answer} required /></Field>
      {publisher && <Checkbox id={`p-${k}`} name="publish" defaultChecked={!f || f.status === "PUBLISHED"} label="Published" />}
    </>
  );
}

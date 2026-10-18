import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { PAGE_DEFS, defaultPageBody } from "@/lib/content";
import { decidePageDraftAction } from "@/app/actions/admin/content";
import { AdminHeader } from "@/components/admin/admin-ui";
import { PageEditor } from "@/components/admin/page-editor";
import { Markdown } from "@/components/markdown";
import { Alert, Card, Prose } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Edit page" };

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requirePermissionPage("content:draft");
  const { slug } = await params;
  const def = PAGE_DEFS.find((p) => p.slug === slug);
  if (!def) notFound();
  const page = await prisma.page.findUnique({ where: { slug } });
  const publisher = can(user.role, "content:publish");
  const body = page?.draftBody ?? page?.body ?? (await defaultPageBody(def));
  return (
    <div className="max-w-6xl space-y-6">
      <AdminHeader title={page?.title ?? def.title} back={{ href: "/admin/content", label: "Website content" }} />
      {def.requiresLegalReview && <Alert tone="warn" title="Legal document">This is a draft legal/policy document. Have it reviewed by a qualified professional before relying on it. Do not add guarantees, return periods or warranty periods you have not decided on.</Alert>}
      {page?.draftStatus === "PENDING_APPROVAL" && (
        <Alert tone="info" title="A draft is awaiting approval">
          The editor below shows the draft. The live page is unchanged until it is approved.
          {publisher && (
            <div className="mt-3 flex gap-2">
              <form action={decidePageDraftAction}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="decision" value="approve" /><Button size="sm">Approve & publish draft</Button></form>
              <form action={decidePageDraftAction}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="decision" value="reject" /><Button size="sm" variant="ghost">Discard draft</Button></form>
            </div>
          )}
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><PageEditor slug={slug} title={page?.draftTitle ?? page?.title ?? def.title} body={body} metaDescription={page?.metaDescription ?? def.metaDescription} canPublish={publisher} /></Card>
        <Card><p className="mb-3 text-xs uppercase tracking-widest text-bone-dim">Preview (saved version)</p><Prose><Markdown source={body} /></Prose></Card>
      </div>
    </div>
  );
}

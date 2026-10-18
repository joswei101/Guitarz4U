import Link from "next/link";
import type { ContactStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { updateMessageAction } from "@/app/actions/admin/misc";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/components/status-badges";
import { toE164ZA } from "@/lib/whatsapp";

export const metadata = { title: "Messages" };

export default async function AdminMessages({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePermissionPage("contact:manage");
  const { status = "NEW" } = await searchParams;
  const msgs = await prisma.contactEnquiry.findMany({ where: status === "ALL" ? {} : { status: status as ContactStatus }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="max-w-4xl space-y-4">
      <AdminHeader title="Contact & support messages" />
      <nav className="flex gap-3 text-sm">{["NEW", "IN_PROGRESS", "RESOLVED", "SPAM", "ALL"].map((s) => <Link key={s} href={`/admin/messages?status=${s}`} className={s === status ? "text-amp" : "text-bone-muted hover:text-amp"}>{s.toLowerCase().replace("_", " ")}</Link>)}</nav>
      {msgs.length === 0 && <EmptyState title="No messages" />}
      {msgs.map((m) => {
        const wa = m.phone ? toE164ZA(m.phone) : null;
        return (
          <Card key={m.id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2"><strong>{m.subject}</strong>{m.isSupport && <Badge tone="info">support</Badge>}<span className="text-xs text-bone-dim">{m.reference} · {fmtDate(m.createdAt, true)}</span></div>
            <p className="whitespace-pre-line text-sm text-bone-muted">{m.message}</p>
            <p className="text-xs">{m.name} · <a className="link" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject} (${m.reference})`)}`}>{m.email}</a>{m.phone && <> · {m.phone}{wa && <a className="link ml-1" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}</>}</p>
            <form action={updateMessageAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={m.id} />
              <Select name="status" defaultValue={m.status} className="w-40" aria-label="Status"><option value="NEW">New</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option><option value="SPAM">Spam</option></Select>
              <Textarea name="adminNotes" defaultValue={m.adminNotes ?? ""} placeholder="Internal notes" className="min-h-10 flex-1" aria-label="Internal notes" />
              <Button size="sm" variant="subtle">Save</Button>
            </form>
          </Card>
        );
      })}
    </div>
  );
}

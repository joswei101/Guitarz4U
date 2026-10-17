import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { submitSupportAction } from "@/app/actions/account";
import { Badge, Card } from "@/components/ui/misc";
import { Field, Input, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/components/forms/action-form";
import { fmtDate } from "@/components/status-badges";

export const metadata = { title: "Support" };

export default async function SupportPage() {
  const user = await requireUserPage("/account/support");
  const tickets = await prisma.contactEnquiry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">Support</h1>
      <Card>
        <h2 className="font-display text-xl uppercase">New support enquiry</h2>
        <ActionForm action={submitSupportAction} submitLabel="Send" hideOnSuccess className="mt-4 space-y-4">
          <Field label="Subject" htmlFor="subject" required><Input id="subject" name="subject" required maxLength={150} /></Field>
          <Field label="Message" htmlFor="message" required hint="Include your order or repair reference if relevant."><Textarea id="message" name="message" required minLength={10} /></Field>
        </ActionForm>
      </Card>
      <Card>
        <h2 className="font-display text-xl uppercase">Your enquiries</h2>
        {tickets.length === 0 ? <p className="mt-2 text-sm text-bone-muted">None yet.</p> : (
          <ul className="mt-3 divide-y divide-ink-500 text-sm">
            {tickets.map((t) => <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{t.reference} · {t.subject} <span className="text-xs text-bone-dim">({fmtDate(t.createdAt)})</span></span><Badge tone={t.status === "RESOLVED" ? "ok" : "info"}>{t.status === "NEW" ? "Received" : t.status === "IN_PROGRESS" ? "In progress" : t.status === "RESOLVED" ? "Resolved" : "Closed"}</Badge></li>)}
          </ul>
        )}
      </Card>
    </div>
  );
}

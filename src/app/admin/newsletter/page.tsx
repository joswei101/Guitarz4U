import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { AdminHeader, Table } from "@/components/admin/admin-ui";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { fmtDate } from "@/components/status-badges";

export const metadata = { title: "Newsletter" };

export default async function NewsletterAdmin() {
  await requirePermissionPage("newsletter:manage");
  const [subs, counts] = await Promise.all([prisma.newsletterSubscription.findMany({ orderBy: { createdAt: "desc" }, take: 500 }), prisma.newsletterSubscription.groupBy({ by: ["status"], _count: true })]);
  return (
    <div className="max-w-4xl space-y-4">
      <AdminHeader title="Newsletter subscribers"><ButtonLink href="/api/admin/export/newsletter" variant="outline">Export confirmed subscribers (CSV)</ButtonLink></AdminHeader>
      <p className="text-sm text-bone-muted">Double opt-in: subscribers must confirm by email. Export confirmed subscribers to your mailing tool (e.g. Brevo or Mailchimp), and include an unsubscribe link in every newsletter. {counts.map((c) => `${c.status.toLowerCase()}: ${c._count}`).join(" · ")}</p>
      <Table>
        <thead><tr><th>Email</th><th>Status</th><th>Consent given</th><th>Confirmed</th></tr></thead>
        <tbody>{subs.map((s) => <tr key={s.id}><td>{s.email}</td><td><Badge tone={s.status === "SUBSCRIBED" ? "ok" : "neutral"}>{s.status.toLowerCase()}</Badge></td><td>{fmtDate(s.consentAt, true)}</td><td>{fmtDate(s.confirmedAt)}</td></tr>)}</tbody>
      </Table>
    </div>
  );
}

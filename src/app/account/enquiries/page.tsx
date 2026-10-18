import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatZAR } from "@/lib/money";
import { Card, EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { EnquiryStatusBadge, fmtDate } from "@/components/status-badges";

export const metadata = { title: "Items I've offered" };

export default async function MyEnquiries() {
  const user = await requireUserPage("/account/enquiries");
  const enquiries = await prisma.purchaseEnquiry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { offers: { where: { party: "BUSINESS" }, orderBy: { createdAt: "desc" } }, events: { where: { isCustomerVisible: true }, orderBy: { createdAt: "asc" } } },
  });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">Items I&apos;ve offered</h1>
      {enquiries.length === 0 && <EmptyState title="No submissions yet" action={<ButtonLink href="/sell">Sell your guitar</ButtonLink>} />}
      {enquiries.map((e) => (
        <Card key={e.id} className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-xl uppercase">{e.reference}</p>
              <p className="text-sm text-bone-muted">{e.instrumentType}{e.brand ? ` · ${e.brand}` : ""}{e.model ? ` ${e.model}` : ""} · {fmtDate(e.createdAt)}</p>
            </div>
            <EnquiryStatusBadge status={e.status} />
          </div>
          {e.offers[0] && <p className="text-sm">Latest offer from Guitarz4U: <strong className="text-amp">{formatZAR(e.offers[0].amountCents)}</strong> ({fmtDate(e.offers[0].createdAt)})</p>}
          {e.events.length > 0 && (
            <ul className="space-y-1 text-sm text-bone-muted">{e.events.map((ev) => <li key={ev.id}>{fmtDate(ev.createdAt)} — {ev.message}</li>)}</ul>
          )}
          <p className="text-xs text-bone-dim">To accept, decline or counter an offer, reply on WhatsApp or email quoting {e.reference}. <Link href="/contact" className="link">Contact options</Link></p>
        </Card>
      ))}
    </div>
  );
}

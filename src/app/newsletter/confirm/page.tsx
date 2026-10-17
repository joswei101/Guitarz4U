import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { Alert, PageHeader } from "@/components/ui/misc";

export const metadata = { title: "Newsletter", robots: { index: false } };

export default async function ConfirmNewsletter({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const sub = token ? await prisma.newsletterSubscription.findUnique({ where: { tokenHash: sha256(token) } }) : null;
  if (sub && sub.status !== "SUBSCRIBED") await prisma.newsletterSubscription.update({ where: { id: sub.id }, data: { status: "SUBSCRIBED", confirmedAt: new Date(), unsubscribedAt: null } });
  return (
    <>
      <PageHeader title="Newsletter" />
      <div className="container max-w-xl py-10">
        {sub ? <Alert tone="ok">You&apos;re subscribed. Thanks! Every email includes an unsubscribe link.</Alert> : <Alert tone="danger">This confirmation link is invalid.</Alert>}
      </div>
    </>
  );
}

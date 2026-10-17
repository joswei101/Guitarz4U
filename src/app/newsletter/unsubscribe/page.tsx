import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { Alert, PageHeader } from "@/components/ui/misc";

export const metadata = { title: "Unsubscribe", robots: { index: false } };

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const sub = token ? await prisma.newsletterSubscription.findUnique({ where: { tokenHash: sha256(token) } }) : null;
  if (sub && sub.status !== "UNSUBSCRIBED") await prisma.newsletterSubscription.update({ where: { id: sub.id }, data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() } });
  return (
    <>
      <PageHeader title="Unsubscribe" />
      <div className="container max-w-xl py-10">
        {sub ? <Alert tone="ok">You&apos;ve been unsubscribed and won&apos;t receive further newsletters.</Alert> : <Alert tone="danger">This unsubscribe link is invalid. Contact us and we&apos;ll remove you manually.</Alert>}
      </div>
    </>
  );
}

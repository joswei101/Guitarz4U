import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { getSetting } from "@/lib/settings";
import { PageHeader, Card } from "@/components/ui/misc";
import { SellForm } from "@/components/forms/sell-form";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sell your guitar to Guitarz4U",
  description: "Sell your used, broken or incomplete guitar or equipment in Johannesburg. Submit photos for a no-obligation offer from Guitarz4U.",
  alternates: { canonical: "/sell" },
};

export default async function SellPage() {
  const [user, types] = await Promise.all([getCurrentUser(), getSetting("sell.acceptedTypes")]);
  return (
    <>
      <PageHeader eyebrow="Sell to us" title="Sell your guitar to Guitarz4U">
        We buy second-hand, broken and incomplete guitars and selected guitar-related equipment. Tell us about your item and we&apos;ll come back with an offer or questions — no asking price needed and no obligation.
      </PageHeader>
      <div className="container grid gap-10 py-10 lg:grid-cols-[1fr_320px]">
        <SellForm types={types} defaults={user ? { name: user.name, email: user.email, phone: user.phone ?? undefined } : undefined} />
        <aside className="space-y-5">
          <Card>
            <h2 className="font-display text-lg uppercase">What happens next</h2>
            <ol className="mt-3 space-y-2 text-sm text-bone-muted">
              <li>1. The owner personally reviews your photos and details.</li>
              <li>2. We may ask for more information.</li>
              <li>3. You get an offer — or a polite no.</li>
              <li>4. Accept, decline or counter. It&apos;s up to you.</li>
              <li>5. Agree a price and arrange a private handover.</li>
            </ol>
          </Card>
          <Card>
            <h2 className="font-display text-lg uppercase">What we accept</h2>
            <ul className="mt-3 space-y-1 text-sm text-bone-muted">{types.map((t) => <li key={t}>• {t}</li>)}</ul>
            <p className="mt-3 text-xs text-bone-dim">Other parts and equipment aren&apos;t accepted automatically. Not sure? <a className="link" href={whatsappLink("Hi Guitarz4U, would you be interested in buying my…")}>Ask on WhatsApp</a>.</p>
          </Card>
          <p className="text-xs text-bone-dim">{site.hoursNote}</p>
        </aside>
      </div>
    </>
  );
}

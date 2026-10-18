import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { HOW_IT_WORKS } from "@/content/copy";

export const metadata: Metadata = {
  title: "How buying, selling and repairs work",
  description: "How purchase requests, reservations, selling your guitar and repairs work at Guitarz4U. No online payments — everything is arranged personally.",
  alternates: { canonical: "/how-it-works" },
};

const sections = [
  { id: "buying", title: "Buying a guitar", steps: HOW_IT_WORKS.buying, cta: { href: "/shop", label: "Browse the shop" } },
  { id: "selling", title: "Selling your guitar", steps: HOW_IT_WORKS.selling, cta: { href: "/sell", label: "Sell your guitar" } },
  { id: "repairs", title: "Repairs", steps: HOW_IT_WORKS.repairs, cta: { href: "/repairs", label: "Book a repair" } },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader eyebrow="How it works" title="Simple, personal and honest">
        Guitarz4U doesn&apos;t take payments online. Every purchase, reservation, offer and repair is confirmed with you
        personally — usually on WhatsApp.
      </PageHeader>
      <div className="container-page py-12">
        <nav aria-label="On this page" className="mb-10 flex flex-wrap gap-2">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="btn btn-outline btn-sm">
              {s.title}
            </a>
          ))}
          <a href="#payments" className="btn btn-outline btn-sm">
            Payments &amp; collection
          </a>
        </nav>
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="mb-14 scroll-mt-24" aria-labelledby={`${s.id}-h`}>
            <h2 id={`${s.id}-h`} className="text-3xl">
              {s.title}
            </h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-4">
              {s.steps.map((step, i) => (
                <li key={step.title} className="card p-5">
                  <span className="font-display text-3xl text-gold">{i + 1}</span>
                  <h3 className="mt-1 text-lg">{step.title}</h3>
                  <p className="mt-2 text-sm text-walnut/80">{step.body}</p>
                </li>
              ))}
            </ol>
            <Link href={s.cta.href} className="btn btn-primary mt-6">
              {s.cta.label}
            </Link>
          </section>
        ))}
        <section id="payments" className="grid scroll-mt-24 gap-6 md:grid-cols-2" aria-labelledby="pay-h">
          <div className="card p-6">
            <h2 id="pay-h" className="text-2xl">
              Payments
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
              <li>No card payments or online payment gateways are used on this website.</li>
              <li>Once we&apos;ve confirmed your request, we&apos;ll agree payment directly — normally by EFT (bank transfer).</li>
              <li>Banking details are shared privately by Guitarz4U. Always confirm details with us on WhatsApp before paying.</li>
              <li>A request or reservation only becomes a sale once we&apos;ve confirmed it and payment has cleared.</li>
            </ul>
          </div>
          <div className="card p-6">
            <h2 className="text-2xl">Reservations, collection &amp; privacy</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
              <li>A reservation request is not confirmed until we approve it. Approved holds last a limited time.</li>
              <li>Our address is never published. It&apos;s shared privately once a purchase or appointment is agreed.</li>
              <li>Courier delivery can be arranged at the buyer&apos;s cost and risk.</li>
              <li>We&apos;re closed on Saturdays.</li>
            </ul>
            <Link href="/policies/returns" className="link mt-4 inline-block text-sm">
              Read the full policy
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/content/PageHeader";
import { Markdown } from "@/components/content/Markdown";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQS } from "@/content/pages";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "Answers about buying second-hand guitars, private EFT payments, reservations, collection in Johannesburg, selling your guitar and repairs at Guitarz4U.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <>
      <PageHeader eyebrow="Help" title="Frequently asked questions">
        <p>Everything you need to know about buying, selling and repairs at Guitarz4U.</p>
      </PageHeader>
      <div className="container-page py-12">
        <div className="mx-auto max-w-3xl space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="card group p-0 open:shadow-[var(--shadow-lift)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-display text-lg text-walnut">
                {f.q}
                <span className="text-2xl text-gold transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <div className="px-5 pb-5">
                <Markdown source={f.a} />
              </div>
            </details>
          ))}
          <p className="pt-6 text-center text-ink-soft">
            Still have a question?{" "}
            <Link href="/contact" className="font-semibold text-gold-ink">
              Contact us
            </Link>
            .
          </p>
        </div>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") },
          })),
        }}
      />
    </>
  );
}

import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = { title: "Frequently asked questions", description: "Answers about buying, selling, repairs, payment and collection at Guitarz4U.", alternates: { canonical: "/faqs" } };

export default async function FaqPage() {
  const faqs = await prisma.faq.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  const groups = [...new Set(faqs.map((f) => f.category))];
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }} />
      <PageHeader eyebrow="Help" title="FAQs" />
      <div className="container max-w-3xl space-y-10 py-10">
        {groups.map((g) => (
          <section key={g} aria-labelledby={`faq-${g}`}>
            <h2 id={`faq-${g}`} className="mb-4 font-display text-2xl uppercase tracking-wide text-amp">{g}</h2>
            <div className="divide-y divide-ink-500 rounded-xl border border-ink-500">
              {faqs.filter((f) => f.category === g).map((f) => (
                <details key={f.id} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-bone">
                    {f.question}<span className="text-amp transition group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-3 whitespace-pre-line text-bone-muted">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-500 p-5">
          <p className="flex-1 text-bone-muted">Didn&apos;t find your answer?</p>
          <ButtonLink href="/contact">Contact us</ButtonLink>
        </div>
      </div>
    </>
  );
}

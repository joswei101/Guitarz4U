import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { FAQS } from "@/content/copy";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers about buying, selling, reservations, payments, collection and guitar repairs at Guitarz4U in Johannesburg.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const groups = [...new Set(FAQS.map((f) => f.group))];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader eyebrow="Help" title="Frequently asked questions" />
      <div className="container-page max-w-3xl py-12">
        {groups.map((g) => (
          <section key={g} className="mb-10" aria-labelledby={`faq-${g}`}>
            <h2 id={`faq-${g}`} className="text-2xl">
              {g}
            </h2>
            <div className="mt-4 space-y-3">
              {FAQS.filter((f) => f.group === g).map((f) => (
                <details key={f.q} className="card group p-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold">
                    {f.q}
                    <span className="text-gold transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="px-5 pb-5 text-walnut/85">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
        <p>
          Still have a question?{" "}
          <Link href="/contact" className="link font-semibold">
            Contact us
          </Link>
          .
        </p>
      </div>
    </>
  );
}

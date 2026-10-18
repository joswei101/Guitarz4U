import type { Metadata } from "next";
import Link from "next/link";
import { FAQ } from "@/lib/faq";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers about buying second-hand guitars from Guitarz4U: purchase requests, private EFT payment, reservations, collection in Johannesburg, selling your guitar and repairs.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHead title="Frequently asked questions" eyebrow="Help" crumbs={[{ label: "FAQ" }]} />
      <div className="wrap section-tight narrow">
        <div className="faq">
          {FAQ.map((f, i) => (
            <details key={i} open={i === 0}>
              <summary>{f.q}</summary>
              <div>{f.a}</div>
            </details>
          ))}
        </div>
        <p style={{ marginTop: 24 }}>Still have a question? <Link href="/contact">Contact us</Link>.</p>
      </div>
    </>
  );
}

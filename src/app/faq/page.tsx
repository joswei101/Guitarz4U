import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { createClient } from '@/lib/supabase/server';
import { fillTokens, getSettings } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Frequently asked questions',
  description: 'Answers about buying, reserving, payment, collection, selling and repairs at Guitarz4U in Sandringham, Johannesburg.',
  alternates: { canonical: '/faq' },
};

export default async function FaqPage() {
  const supabase = await createClient();
  const [{ data }, s] = await Promise.all([
    supabase.from('faqs').select('id, question, answer').eq('is_published', true).order('sort_order'),
    getSettings(),
  ]);
  const faqs = (data ?? []).map((f) => ({ ...f, answer: fillTokens(f.answer, s) }));
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  };
  return (
    <>
      {faqs.length ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} /> : null}
      <PageHero title="Frequently asked questions" crumb="FAQ" />
      <div className="section"><div className="wrap narrow">
        {faqs.length ? faqs.map((f) => (
          <details key={f.id} className="disclosure">
            <summary>{f.question}</summary>
            <div><p style={{ whiteSpace: 'pre-line', margin: 0 }}>{f.answer}</p></div>
          </details>
        )) : <p>No questions yet.</p>}
        <p style={{ marginTop: 24 }}>Still have a question? <Link href="/contact">Contact us</Link>.</p>
      </div></div>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Markdown } from '@/components/Markdown';
import { PageHero } from '@/components/PageHero';
import { getContent } from '@/lib/site';

export const metadata: Metadata = {
  title: 'How buying, selling and repairs work',
  description: 'Step by step: buying a second-hand guitar, selling or giving away a guitar, and getting a repair at Guitarz4U. No online payments, collection only.',
  alternates: { canonical: '/how-it-works' },
};

export default async function ProcessPage() {
  const c = await getContent('process');
  return (
    <>
      <PageHero title="How it works" intro="Simple, transparent and personal — from the first message to collection." />
      <div className="section"><div className="wrap">
        <Markdown>{c?.body ?? ''}</Markdown>
        <p style={{ marginTop: 24 }}>More detail: <Link href="/legal/collection-reservation">collection &amp; reservations</Link> · <Link href="/legal/seller-terms">seller terms</Link> · <Link href="/legal/repair-terms">repair terms</Link> · <Link href="/legal/returns">returns</Link>.</p>
      </div></div>
    </>
  );
}

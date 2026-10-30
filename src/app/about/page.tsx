import type { Metadata } from 'next';
import Link from 'next/link';
import { Markdown } from '@/components/Markdown';
import { PageHero } from '@/components/PageHero';
import { getContent } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About Guitarz4U',
  description: 'Guitarz4U is an owner-run second-hand guitar shop and repair service in Sandringham, Johannesburg.',
  alternates: { canonical: '/about' },
};

export default async function AboutPage() {
  const c = await getContent('about');
  return (
    <>
      <PageHero title="About Guitarz4U" crumb="About" />
      <div className="section"><div className="wrap">
        <Markdown>{c?.body ?? ''}</Markdown>
        <div className="row" style={{ marginTop: 24 }}>
          <Link href="/shop" className="btn btn-primary">Shop guitars</Link>
          <Link href="/contact" className="btn btn-outline">Contact us</Link>
        </div>
      </div></div>
    </>
  );
}

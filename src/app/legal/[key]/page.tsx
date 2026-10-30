import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Markdown } from '@/components/Markdown';
import { DraftNotice, PageHero } from '@/components/PageHero';
import { formatDate } from '@/lib/format';
import { getContent } from '@/lib/site';

type Params = Promise<{ key: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const c = await getContent((await params).key);
  if (!c?.is_legal) return { title: 'Not found' };
  return { title: c.title, alternates: { canonical: `/legal/${c.key}` } };
}

export default async function LegalPage({ params }: { params: Params }) {
  const c = await getContent((await params).key);
  if (!c || !c.is_legal) notFound();
  return (
    <>
      <PageHero title={c.title} crumb="Policies" />
      <div className="section"><div className="wrap">
        {c.is_draft ? <DraftNotice updated={formatDate(c.updated_at)} /> : <p className="small muted">Last updated {formatDate(c.updated_at)}</p>}
        <Markdown>{c.body.replace(/^\*\*Draft for owner review[^\n]*\n+/, '')}</Markdown>
      </div></div>
    </>
  );
}

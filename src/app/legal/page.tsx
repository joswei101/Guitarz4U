import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Policies', description: 'Guitarz4U policies: privacy, terms, collection and reservations, seller terms, repair terms, returns and cookies.', alternates: { canonical: '/legal' } };

export default async function LegalIndex() {
  const supabase = await createClient();
  const { data } = await supabase.from('site_content').select('key, title, is_draft').eq('is_legal', true).order('title');
  return (
    <>
      <PageHero title="Policies" crumb="Policies" />
      <div className="section"><div className="wrap narrow">
        <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
          {(data ?? []).map((d) => (
            <li key={d.key} className="card-plain row-between">
              <Link href={`/legal/${d.key}`}><strong>{d.title}</strong></Link>
              {d.is_draft ? <span className="badge badge-warn">Draft</span> : null}
            </li>
          ))}
        </ul>
      </div></div>
    </>
  );
}

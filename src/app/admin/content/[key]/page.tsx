import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentEditor } from '@/components/admin/ContentEditor';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const PUBLIC_URL: Record<string, string> = { 'home-intro': '/', about: '/about', process: '/how-it-works', 'contact-intro': '/contact', 'sell-intro': '/sell', 'repairs-intro': '/repairs' };

export default async function EditContent({ params }: { params: Promise<{ key: string }> }) {
  await requireStaff('content');
  const { key } = await params;
  const supabase = await createClient();
  const { data: c } = await supabase.from('site_content').select('*').eq('key', key).maybeSingle();
  if (!c) notFound();
  const url = c.is_legal ? `/legal/${c.key}` : PUBLIC_URL[c.key] ?? '/';
  return (
    <>
      <p><Link href="/admin/content">← Website content</Link> · <Link href={url} target="_blank">View on website</Link></p>
      <h1>{c.title}</h1>
      <ContentEditor block={{ key: c.key, title: c.title, body: c.body, is_legal: c.is_legal, is_draft: c.is_draft }} />
    </>
  );
}

import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';

export default async function ContentAdmin() {
  await requireStaff('content');
  const supabase = await createClient();
  const { data } = await supabase.from('site_content').select('key, title, is_legal, is_draft, updated_at').order('is_legal').order('title');
  return (
    <>
      <h1>Website content</h1>
      <p className="muted">Edit page text and policies. Text uses simple Markdown formatting (## headings, **bold**, - bullet points). Tokens like {'{{whatsapp}}'} are filled in automatically from Settings.</p>
      <div className="table-wrap"><table className="data"><thead><tr><th>Page</th><th>Type</th><th>Status</th><th>Updated</th></tr></thead>
        <tbody>{(data ?? []).map((c) => (
          <tr key={c.key}><td><Link href={`/admin/content/${c.key}`}>{c.title}</Link></td><td>{c.is_legal ? 'Legal policy' : 'Page text'}</td>
            <td>{c.is_legal ? (c.is_draft ? <span className="badge badge-warn">Draft — needs review</span> : <span className="badge badge-good">Reviewed</span>) : '—'}</td><td>{formatDateTime(c.updated_at)}</td></tr>
        ))}</tbody></table></div>
      <p><Link href="/admin/faqs">Edit FAQs →</Link></p>
    </>
  );
}

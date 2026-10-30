import Link from 'next/link';
import { moderateReview } from '@/app/actions/admin-site';
import { Flash } from '@/components/Flash';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmButton, SubmitButton } from '@/components/forms';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';
import { REVIEW_TOPICS, label } from '@/lib/labels';

export default async function ReviewsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff('reviews');
  const sp = await searchParams;
  const status = sp.status ?? 'pending';
  const supabase = await createClient();
  const { data } = await supabase.from('reviews').select('*').eq('status', status).order('created_at', { ascending: false }).limit(100);
  return (
    <>
      <Flash ok={sp.ok} error={sp.error} />
      <h1>Reviews</h1>
      <p className="muted">Only approve genuine reviews. Never edit a customer&apos;s words — approve or reject them as written.</p>
      <nav className="tabs">{['pending', 'approved', 'rejected', 'removed'].map((s) => <Link key={s} href={`/admin/reviews?status=${s}`} aria-current={status === s ? 'page' : undefined}>{s}</Link>)}</nav>
      {data?.length ? data.map((r) => (
        <article key={r.id} className="card stack">
          <div className="row-between"><strong>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} {r.title}</strong><StatusBadge status={r.status} text={r.status} /></div>
          <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{r.body}</p>
          <div className="small muted">{r.display_name} · {label(REVIEW_TOPICS, r.related_to)} · {formatDateTime(r.created_at)}</div>
          <div className="row">
            {r.status !== 'approved' ? <form action={moderateReview}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="approved" /><SubmitButton className="btn btn-primary btn-small">Approve &amp; publish</SubmitButton></form> : null}
            {r.status === 'pending' ? <form action={moderateReview} className="row"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="rejected" /><label className="visually-hidden" htmlFor={`rn-${r.id}`}>Reason</label><input id={`rn-${r.id}`} name="note" placeholder="Reason (private)" style={{ maxWidth: 220 }} /><SubmitButton className="btn btn-outline btn-small">Reject</SubmitButton></form> : null}
            {r.status === 'approved' ? <form action={moderateReview}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="removed" /><ConfirmButton message="Remove this published review from the website?">Remove from website</ConfirmButton></form> : null}
          </div>
        </article>
      )) : <p className="muted">No {status} reviews.</p>}
    </>
  );
}

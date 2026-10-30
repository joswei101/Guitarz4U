import Link from 'next/link';
import { markAllNotificationsRead } from '@/app/actions/account';
import { SubmitButton } from '@/components/forms';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';

export default async function NotificationsPage() {
  const { user } = await requireUser('/account/notifications');
  const supabase = await createClient();
  const { data } = await supabase.from('notifications').select('id, title, body, link, created_at, read_at')
    .eq('user_id', user.id).eq('audience', 'customer').order('created_at', { ascending: false }).limit(100);
  return (
    <div className="stack">
      <div className="row-between"><h1 style={{ margin: 0 }}>Notifications</h1>
        <form action={markAllNotificationsRead}><SubmitButton className="btn btn-outline btn-small">Mark all as read</SubmitButton></form></div>
      {data?.length ? data.map((n) => (
        <article key={n.id} className="card-plain">
          <div className="row-between"><strong>{n.title}</strong>{!n.read_at ? <span className="badge badge-warn">New</span> : null}</div>
          <p className="small" style={{ whiteSpace: 'pre-line', margin: '6px 0' }}>{n.body}</p>
          <div className="small muted">{formatDateTime(n.created_at)}{n.link ? <> · <Link href={n.link}>View</Link></> : null}</div>
        </article>
      )) : <p className="muted">No notifications yet.</p>}
    </div>
  );
}

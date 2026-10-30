import Link from 'next/link';
import { markStaffNotificationsRead, retryFailedEmail, sendTestEmail } from '@/app/actions/admin-site';
import { Flash } from '@/components/Flash';
import { StatusBadge } from '@/components/StatusBadge';
import { SubmitButton } from '@/components/forms';
import { profileHasPerm, requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';

export default async function NotificationsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { profile } = await requireStaff();
  const sp = await searchParams;
  const supabase = await createClient();
  const canEmail = profileHasPerm(profile, 'settings');
  const [{ data: notes }, { data: emails }] = await Promise.all([
    supabase.from('notifications').select('*').eq('audience', 'staff').order('created_at', { ascending: false }).limit(100),
    canEmail ? supabase.from('email_outbox').select('id, to_email, subject, status, error, attempts, created_at, sent_at').order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: null }),
  ]);
  return (
    <>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="row-between"><h1 style={{ margin: 0 }}>Notifications</h1>
        <form action={markStaffNotificationsRead}><SubmitButton className="btn btn-outline btn-small">Mark all read</SubmitButton></form></div>
      <section className="card">
        {notes?.length ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{notes.map((n) => (
            <li key={n.id} style={{ borderTop: '1px solid var(--line)', padding: '10px 0' }}>
              <strong>{n.link ? <Link href={n.link}>{n.title}</Link> : n.title}</strong> {!n.read_at ? <span className="badge badge-warn">New</span> : null}
              <div className="small" style={{ whiteSpace: 'pre-line' }}>{n.body}</div>
              <div className="small muted">{formatDateTime(n.created_at)}</div>
            </li>
          ))}</ul>
        ) : <p className="muted">No notifications yet.</p>}
      </section>
      {canEmail ? (
        <section className="card stack">
          <div className="row-between"><h2 style={{ fontSize: '1.2rem', margin: 0 }}>Email log</h2>
            <form action={sendTestEmail}><SubmitButton className="btn btn-outline btn-small">Send a test email</SubmitButton></form></div>
          <p className="small muted">&quot;Sent&quot; means your email provider accepted the message. It cannot guarantee the recipient read it or that it avoided their spam folder. &quot;Skipped&quot; means email is not configured.</p>
          {emails?.length ? (
            <div className="table-wrap"><table className="data"><thead><tr><th>When</th><th>To</th><th>Subject</th><th>Status</th><th /></tr></thead>
              <tbody>{emails.map((e) => (
                <tr key={e.id}><td>{formatDateTime(e.created_at)}</td><td className="small">{e.to_email}</td><td className="small">{e.subject}</td>
                  <td><StatusBadge status={e.status === 'sent' ? 'sent-ok' : e.status} text={e.status} />{e.error ? <div className="small muted">{e.error}</div> : null}</td>
                  <td>{e.status !== 'sent' ? <form action={retryFailedEmail}><input type="hidden" name="id" value={e.id} /><SubmitButton className="btn btn-outline btn-small">Retry</SubmitButton></form> : null}</td></tr>
              ))}</tbody></table></div>
          ) : <p className="muted">No emails yet.</p>}
        </section>
      ) : null}
      <section className="card">
        <h2 style={{ fontSize: '1.2rem' }}>WhatsApp</h2>
        <p className="small">Automatic WhatsApp messages are not used, because WhatsApp&apos;s business messaging API charges for messages the business starts. Instead, each enquiry, offer, seller and repair page has a &quot;WhatsApp customer&quot; button that opens WhatsApp with a ready-written message — <strong>you still need to press Send</strong>, and the website cannot tell whether the message was delivered.</p>
      </section>
    </>
  );
}

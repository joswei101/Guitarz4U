import { SettingsForm } from '@/components/admin/SettingsForm';
import { requireStaff } from '@/lib/auth';
import { getSettings } from '@/lib/site';
import { CF_ANALYTICS_TOKEN, SITE_URL, TURNSTILE_SITE_KEY } from '@/lib/env';

export default async function SettingsAdmin() {
  await requireStaff('settings');
  const s = await getSettings();
  const status = [
    ['Website address', SITE_URL],
    ['Email (SMTP)', process.env.SMTP_HOST ? `Configured (${process.env.SMTP_HOST})` : 'Not configured — emails are skipped'],
    ['Spam check (Turnstile)', TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY ? 'Enabled' : 'Off (honeypot + rate limits only)'],
    ['Cloudflare analytics', CF_ANALYTICS_TOKEN ? 'Enabled' : 'Off'],
    ['Online payments', 'None — by design'],
  ];
  return (
    <>
      <h1>Settings</h1>
      <SettingsForm settings={s} />
      <section className="card">
        <h2 style={{ fontSize: '1.15rem' }}>System status</h2>
        <table className="data"><tbody>{status.map(([k, v]) => <tr key={k}><th scope="row" style={{ textAlign: 'left', textTransform: 'none', letterSpacing: 0 }}>{k}</th><td>{v}</td></tr>)}</tbody></table>
        <p className="small muted">Secret keys are set in your hosting provider (Netlify), never here. See the setup guide.</p>
      </section>
    </>
  );
}

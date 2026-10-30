import { EmailForm, PasswordForm, ProfileForm } from '@/components/AccountForms';
import { requireUser } from '@/lib/auth';

export default async function ProfilePage() {
  const { user, profile } = await requireUser('/account/profile');
  const usesPassword = user.app_metadata?.providers?.includes('email') ?? user.app_metadata?.provider === 'email';
  return (
    <div className="stack">
      <h1>Profile &amp; settings</h1>
      <ProfileForm profile={profile} />
      <EmailForm current={user.email ?? ''} />
      {usesPassword ? <PasswordForm /> : <div className="card"><h2 style={{ fontSize: '1.2rem' }}>Password</h2><p className="muted">You sign in with Google, so there is no separate password to manage.</p></div>}
    </div>
  );
}

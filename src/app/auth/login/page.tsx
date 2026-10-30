import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/AuthShell';
import { LoginForm } from '@/components/AuthForms';
import { GoogleButton } from '@/components/GoogleButton';
import { Flash } from '@/components/Flash';
import { getUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/account';
  if (await getUser()) redirect(next);
  return (
    <AuthShell title="Sign in" intro="Track reservations, repairs and guitars you've offered us.">
      <Flash ok={sp.ok} error={sp.error} />
      <GoogleButton next={next} />
      <p className="muted small" style={{ textAlign: 'center', margin: '14px 0' }}>or with your email</p>
      <LoginForm next={next} />
      <hr />
      <p>New here? <Link href={`/auth/register?next=${encodeURIComponent(next)}`}>Create an account</Link></p>
    </AuthShell>
  );
}

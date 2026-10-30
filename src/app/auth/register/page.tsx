import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/AuthShell';
import { RegisterForm } from '@/components/AuthForms';
import { GoogleButton } from '@/components/GoogleButton';
import { getUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Create an account', robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/account';
  if (await getUser()) redirect(next);
  return (
    <AuthShell title="Create an account" intro="Free. Lets you reserve guitars, keep a wishlist and follow your repairs and submissions.">
      <GoogleButton next={next} />
      <p className="muted small" style={{ textAlign: 'center', margin: '14px 0' }}>or register with your email</p>
      <RegisterForm next={next} />
      <hr />
      <p>Already registered? <Link href={`/auth/login?next=${encodeURIComponent(next)}`}>Sign in</Link></p>
    </AuthShell>
  );
}

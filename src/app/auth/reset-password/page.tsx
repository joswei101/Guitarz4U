import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/AuthShell';
import { ResetForm } from '@/components/AuthForms';
import { getUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } };

export default async function ResetPage() {
  const user = await getUser();
  return (
    <AuthShell title="Choose a new password">
      {user ? <ResetForm /> : (
        <div className="alert alert-error">This reset link has expired or was opened in a different browser. <Link href="/auth/forgot-password">Request a new link</Link>.</div>
      )}
    </AuthShell>
  );
}

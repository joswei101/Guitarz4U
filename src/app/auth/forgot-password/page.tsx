import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/AuthShell';
import { ForgotForm } from '@/components/AuthForms';

export const metadata: Metadata = { title: 'Reset your password', robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthShell title="Reset your password" intro="Enter your email and we'll send you a link to choose a new password.">
      <ForgotForm />
      <p style={{ marginTop: 16 }}><Link href="/auth/login">Back to sign in</Link></p>
      <p className="small muted">Signed up with Google? Use &quot;Continue with Google&quot; instead — there is no separate password.</p>
    </AuthShell>
  );
}

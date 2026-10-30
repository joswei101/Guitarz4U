import type { Metadata } from 'next';
import { unsubscribeAlert } from '@/app/actions/public';
import { AuthShell } from '@/components/AuthShell';
import { SubmitButton } from '@/components/forms';

export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false } };

// Unsubscribing requires a button press (not just opening the link), so email
// security scanners that pre-open links don't unsubscribe people by accident.
export default async function Unsubscribe({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const { done } = await searchParams;
  return (
    <AuthShell title="Stock alert emails">
      {done ? <p role="status">You have been unsubscribed from this stock alert.</p> : (
        <form action={unsubscribeAlert} className="stack">
          <input type="hidden" name="token" value={token} />
          <p>Stop receiving emails for this stock alert?</p>
          <SubmitButton>Unsubscribe</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}

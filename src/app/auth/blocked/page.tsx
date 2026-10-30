import type { Metadata } from 'next';
import { AuthShell } from '@/components/AuthShell';

export const metadata: Metadata = { title: 'Account suspended', robots: { index: false } };

export default function BlockedPage() {
  return (
    <AuthShell title="Account suspended">
      <p>This account has been suspended. If you think this is a mistake, please contact us on WhatsApp (064 856 7019) or by email (Joshuaweinfas@gmail.com).</p>
      <form action="/auth/signout" method="post"><button className="btn btn-outline" type="submit">Sign out</button></form>
    </AuthShell>
  );
}

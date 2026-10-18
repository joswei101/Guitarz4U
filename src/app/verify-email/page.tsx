import type { Metadata } from "next";
import { verifyEmailToken } from "@/lib/auth/service";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Verify email", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token ? await verifyEmailToken(token) : false;
  return (
    <AuthShell title="Email verification">
      {ok ? (
        <>
          <Alert tone="ok">Thanks — your email address is verified. Checkout, reviews and repair tracking are now enabled.</Alert>
          <ButtonLink href="/account" className="mt-6 w-full">Go to my account</ButtonLink>
        </>
      ) : (
        <>
          <Alert tone="danger">This verification link is invalid, has expired or has already been used.</Alert>
          <p className="mt-4 text-sm text-bone-muted">Sign in and use “Resend verification email” on your account page to get a new link.</p>
          <ButtonLink href="/account" variant="outline" className="mt-6 w-full">My account</ButtonLink>
        </>
      )}
    </AuthShell>
  );
}

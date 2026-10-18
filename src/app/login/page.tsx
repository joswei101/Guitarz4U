import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/forms/AuthShell";
import { LoginForm } from "@/components/forms/AuthForms";
import { GoogleButton } from "@/components/forms/GoogleButton";
import { Alert } from "@/components/ui/Alert";
import { GOOGLE_AUTH_ENABLED } from "@/lib/env";
import { getUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getUser()) redirect(next);
  return (
    <AuthShell
      title="Sign in"
      subtitle={
        <>
          New to Guitarz4U?{" "}
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="link font-semibold text-walnut">
            Create a free account
          </Link>
        </>
      }
    >
      {sp.confirmed === "1" && (
        <Alert tone="success" className="mb-4">
          Your email address is confirmed. You can sign in now.
        </Alert>
      )}
      {sp.error && (
        <Alert tone="error" className="mb-4">
          That link is invalid or has expired. Please try again.
        </Alert>
      )}
      {GOOGLE_AUTH_ENABLED && (
        <>
          <GoogleButton next={next} />
          <p className="my-4 text-center text-xs uppercase tracking-widest text-tan">or</p>
        </>
      )}
      <LoginForm next={next} />
    </AuthShell>
  );
}

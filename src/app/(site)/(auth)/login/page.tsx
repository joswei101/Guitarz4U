import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "../AuthShell";
import { GoogleButton, ResendVerification, SignInForm } from "@/components/forms/AuthForms";
import { getUser } from "@/lib/auth";
import { GOOGLE_AUTH_ENABLED } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next: rawNext, error } = await searchParams;
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/account";
  if (await getUser()) redirect(next);
  return (
    <AuthShell
      title="Welcome back"
      subtitle={
        <>
          New to Guitarz4U?{" "}
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-gold-ink">
            Create a free account
          </Link>
        </>
      }
    >
      {error === "link" && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-bg p-3 text-sm text-danger">
          That link is invalid or has expired. If you were confirming your email, try signing in — it may already be confirmed. Otherwise, request a new link.
        </p>
      )}
      {GOOGLE_AUTH_ENABLED && (
        <>
          <GoogleButton next={next} />
          <p className="my-4 text-center text-xs uppercase tracking-widest text-ink-soft">or</p>
        </>
      )}
      <SignInForm next={next} />
      <div className="mt-6">
        <ResendVerification />
      </div>
    </AuthShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "../AuthShell";
import { GoogleButton, SignUpForm } from "@/components/forms/AuthForms";
import { getUser } from "@/lib/auth";
import { GOOGLE_AUTH_ENABLED } from "@/lib/env";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const { next: rawNext } = await searchParams;
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/account";
  if (await getUser()) redirect(next);
  return (
    <AuthShell
      title="Create your account"
      subtitle={
        <>
          Track purchase requests, reservations, seller submissions and repairs. Already registered?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-gold-ink">
            Sign in
          </Link>
        </>
      }
    >
      {GOOGLE_AUTH_ENABLED && (
        <>
          <GoogleButton next={next} />
          <p className="my-4 text-center text-xs uppercase tracking-widest text-ink-soft">or</p>
        </>
      )}
      <SignUpForm next={next} />
    </AuthShell>
  );
}

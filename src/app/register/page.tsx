import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/forms/AuthShell";
import { RegisterForm } from "@/components/forms/AuthForms";
import { GoogleButton } from "@/components/forms/GoogleButton";
import { GOOGLE_AUTH_ENABLED } from "@/lib/env";
import { getUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a free Guitarz4U account to send requests, track repairs and sell your guitar.",
  robots: { index: false },
};

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getUser()) redirect(next);
  return (
    <AuthShell
      title="Create your account"
      subtitle={
        <>
          Already registered?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="link font-semibold text-walnut">
            Sign in
          </Link>
        </>
      }
    >
      <p className="mb-5 text-sm">
        A free account lets you send purchase and reservation requests, sell your guitar, book repairs and track
        everything in one place.
      </p>
      {GOOGLE_AUTH_ENABLED && (
        <>
          <GoogleButton next={next} />
          <p className="my-4 text-center text-xs uppercase tracking-widest text-tan">or</p>
        </>
      )}
      <RegisterForm next={next} />
    </AuthShell>
  );
}

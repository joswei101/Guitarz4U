import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/forms";
import { Alert } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  if (await getCurrentUser()) redirect(sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/account");
  return (
    <AuthShell title="Sign in" footer={<>New to Guitarz4U? <Link href={`/register${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`} className="link">Create an account</Link></>}>
      {sp.reset && <Alert tone="ok" className="mb-5">Your password has been changed. Please sign in.</Alert>}
      <LoginForm next={sp.next} />
    </AuthShell>
  );
}

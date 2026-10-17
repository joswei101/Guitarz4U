import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/forms";
import { Alert } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password">
      {token ? <ResetForm token={token} /> : <Alert tone="danger">This link is incomplete. Please use the link from your email.</Alert>}
    </AuthShell>
  );
}

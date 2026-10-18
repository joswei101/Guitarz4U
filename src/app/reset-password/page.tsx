import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/forms/AuthShell";
import { ResetPasswordForm } from "@/components/forms/AuthForms";
import { Alert } from "@/components/ui/Alert";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage() {
  const user = await getUser();
  return (
    <AuthShell title="Choose a new password">
      {user ? (
        <ResetPasswordForm />
      ) : (
        <Alert tone="error" title="Reset link expired">
          Please{" "}
          <Link href="/forgot-password" className="link">
            request a new reset link
          </Link>
          .
        </Alert>
      )}
    </AuthShell>
  );
}

import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password">
      <p className="mb-5 text-sm text-bone-muted">Enter the email address you registered with and we'll send you a secure link to choose a new password.</p>
      <ForgotForm />
    </AuthShell>
  );
}

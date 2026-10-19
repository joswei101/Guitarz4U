import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../AuthShell";
import { ForgotPasswordForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle={<>Enter your email address and we&apos;ll send you a link to choose a new password.</>}
    >
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-gold-ink">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

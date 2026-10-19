import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../AuthShell";
import { UpdatePasswordForm } from "@/components/forms/AuthForms";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage() {
  const user = await getUser();
  return (
    <AuthShell title="Choose a new password">
      {user ? (
        <UpdatePasswordForm />
      ) : (
        <p className="text-center text-sm text-ink-soft">
          Your reset link has expired or was already used.{" "}
          <Link href="/forgot-password" className="font-semibold text-gold-ink">
            Request a new link
          </Link>
          .
        </p>
      )}
    </AuthShell>
  );
}

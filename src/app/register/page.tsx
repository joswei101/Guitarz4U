import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <AuthShell title="Create your account" footer={<>Already have an account? <Link href="/login" className="link">Sign in</Link></>}>
      <p className="mb-5 text-sm text-bone-muted">An account lets you check out, track orders and repairs, save a wishlist and leave reviews. We'll ask you to verify your email address.</p>
      <RegisterForm />
    </AuthShell>
  );
}

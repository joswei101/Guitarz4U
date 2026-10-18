import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { features } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
import { PageHead } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; verified?: string; reset?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/account");
  return (
    <>
      <PageHead title="Log in" crumbs={[{ label: "Log in" }]} />
      <div className="wrap section-tight" style={{ maxWidth: 520 }}>
        {sp.reset === "1" && <div className="notice notice-good" style={{ marginBottom: 16 }}><strong>Password changed</strong><p>You can now log in with your new password.</p></div>}
        <LoginForm next={sp.next ?? ""} google={features.google} emailEnabled={features.email} />
      </div>
    </>
  );
}

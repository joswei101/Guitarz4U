import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/ui";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHead title="Choose a new password" crumbs={[{ label: "Reset password" }]} />
      <div className="wrap section-tight" style={{ maxWidth: 520 }}>
        {sp.token && !sp.error ? (
          <ResetForm token={sp.token} />
        ) : (
          <div className="notice notice-bad">
            <strong>This reset link is invalid or has expired</strong>
            <p><Link href="/forgot-password">Request a new link</Link>.</p>
          </div>
        )}
      </div>
    </>
  );
}

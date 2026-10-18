import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { features } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
import { PageHead } from "@/components/ui";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  if (await getCurrentUser()) redirect("/account");
  return (
    <>
      <PageHead title="Create an account" intro="Track your purchase requests, reservations, guitar submissions and repairs in one place." crumbs={[{ label: "Create an account" }]} />
      <div className="wrap section-tight" style={{ maxWidth: 560 }}>
        <RegisterForm next={sp.next ?? ""} google={features.google} verifyEmail={features.email} />
      </div>
    </>
  );
}

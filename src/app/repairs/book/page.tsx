import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { REPAIR_INSTRUMENTS, REPAIR_SERVICES } from "@/lib/repairs/status";
import { getSetting } from "@/lib/settings";
import { Alert, PageHeader } from "@/components/ui/misc";
import { RepairForm } from "@/components/forms/repair-form";

export const metadata: Metadata = { title: "Book a repair / request an assessment", description: "Request a guitar or amplifier repair assessment from Guitarz4U in Sandringham, Johannesburg.", alternates: { canonical: "/repairs/book" } };

export default async function BookRepairPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const [{ service }, user, accepting] = await Promise.all([searchParams, getCurrentUser(), getSetting("repairs.acceptingRequests")]);
  return (
    <>
      <PageHeader eyebrow="Repairs" title="Request a repair assessment">
        Tell us about the instrument and the problem. The owner reviews every request personally. No payment is taken now.
      </PageHeader>
      <div className="container max-w-4xl py-10">
        {!user && <Alert tone="info" className="mb-6">Tip: <a href="/login?next=/repairs/book">sign in</a> or <a href="/register">create an account</a> first to approve quotes and track this repair in your account. You can still submit without one.</Alert>}
        {accepting ? <RepairForm instruments={REPAIR_INSTRUMENTS} services={REPAIR_SERVICES} preselect={service} defaults={user ? { name: user.name, email: user.email, phone: user.phone ?? undefined } : undefined} /> : <Alert tone="warn">We&apos;re not accepting new repair requests right now. Please check back soon or contact us on WhatsApp.</Alert>}
      </div>
    </>
  );
}

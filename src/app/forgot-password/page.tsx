import type { Metadata } from "next";
import { features } from "@/lib/env";
import { getSettings, whatsappLink } from "@/lib/settings";
import { PageHead } from "@/components/ui";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ForgotPage() {
  const s = await getSettings();
  return (
    <>
      <PageHead title="Forgot your password?" crumbs={[{ label: "Reset password" }]} />
      <div className="wrap section-tight" style={{ maxWidth: 520 }}>
        {features.email ? (
          <ForgotForm />
        ) : (
          <div className="notice notice-warn">
            <strong>Password reset emails are not switched on yet</strong>
            <p>This website cannot send emails at the moment, so automatic password resets are unavailable. Please contact Guitarz4U on <a href={whatsappLink(s.whatsappNumber, "Hi Guitarz4U, I need help logging in to my account.")}>WhatsApp ({s.whatsappNumber})</a> or <a href={`mailto:${s.email}`}>{s.email}</a> and we will help you.</p>
          </div>
        )}
      </div>
    </>
  );
}

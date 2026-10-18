import { createClient } from "@/lib/supabase/server";
import { AdminTitle } from "@/components/admin/AdminUi";
import { SettingsTextForm } from "@/components/admin/ContentForms";
import { ActionButton } from "@/components/account/ActionButton";
import { Alert } from "@/components/ui/Alert";
import { loadDemoData, removeDemoData } from "@/app/actions/admin";
import { isEmailConfigured } from "@/lib/email";
import { GOOGLE_AUTH_ENABLED, SITE_URL } from "@/lib/env";
import { BUSINESS } from "@/lib/constants";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data }, demo] = await Promise.all([
    supabase.from("site_settings").select("key, value"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_demo", true),
  ]);
  const v = Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<string, unknown>;
  const s = (k: string) => (v[k] === null || v[k] === undefined ? null : String(v[k]));
  return (
    <div className="max-w-4xl space-y-6">
      <AdminTitle title="Settings" />
      <SettingsTextForm
        title="Contact details"
        description="Shown across the website and used for WhatsApp links."
        fields={[
          { key: "whatsapp_number", label: "WhatsApp number", value: s("whatsapp_number"), placeholder: BUSINESS.whatsapp },
          { key: "contact_email", label: "Email address", value: s("contact_email"), placeholder: BUSINESS.email },
          { key: "social_handle", label: "Social media handle (without @)", value: s("social_handle"), placeholder: BUSINESS.socialHandle },
          { key: "closed_notice", label: "Opening-hours notice", value: s("closed_notice"), placeholder: BUSINESS.closedNotice, hint: "Business hours are not published — only this notice." },
        ]}
      />
      <SettingsTextForm
        title="Private details (never shown publicly)"
        description="Stored privately — only admins can read these. Use the “+ Collection address” / “+ Bank details” buttons when messaging a customer AFTER you've approved their purchase."
        fields={[
          { key: "collection_address", label: "Collection address", value: s("collection_address"), placeholder: "Street address, Sandringham…", rows: 2 },
          { key: "bank_details", label: "Bank details for EFT", value: s("bank_details"), placeholder: "Bank, account name, account number, branch code", rows: 3 },
        ]}
      />
      <SettingsTextForm
        title="Reservations"
        fields={[{ key: "reservation_hold_days", label: "Default hold period (days, 1–30)", value: s("reservation_hold_days"), placeholder: "3", hint: "How long an approved reservation is held. You can change it per reservation." }]}
      />
      <section className="card space-y-3 p-5">
        <h2 className="text-xl">Integrations status</h2>
        <ul className="space-y-1 text-sm">
          <li>Website address: <strong>{SITE_URL}</strong></li>
          <li>Email notifications: <strong>{isEmailConfigured() ? "Configured" : "Not configured (in-app only)"}</strong></li>
          <li>Google sign-in: <strong>{GOOGLE_AUTH_ENABLED ? "Enabled" : "Not enabled"}</strong></li>
          <li>Online payments: <strong>None — by design</strong></li>
        </ul>
        <p className="text-xs text-tan">See docs/SETUP.md for how to configure these. All are free.</p>
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="text-xl">Demo data</h2>
        <p className="text-sm">
          Load a few clearly labelled demo listings (with illustrations, not photos) to preview the shop. Demo items show a
          “Demo listing” badge and are hidden from search engines. <strong>Remove them before launch.</strong> No fake
          reviews or customers are ever created.
        </p>
        {(demo.count ?? 0) > 0 && <Alert tone="warning">{demo.count} demo product(s) are currently live on the website.</Alert>}
        <div className="flex flex-wrap gap-2">
          <ActionButton action={loadDemoData} className="btn btn-outline">Load demo products</ActionButton>
          <ActionButton action={removeDemoData} confirm="Remove ALL demo products?" className="btn btn-danger">Remove all demo data</ActionButton>
        </div>
      </section>
      <section className="card space-y-2 p-5 text-sm">
        <h2 className="text-xl">Administrators</h2>
        <p>For security there is no admin sign-up page. To add or remove an administrator, run this in the Supabase SQL editor:</p>
        <pre className="overflow-x-auto rounded bg-espresso p-3 text-xs text-cream">select public.promote_to_admin(&apos;person@example.com&apos;);{"\n"}select public.demote_admin(&apos;person@example.com&apos;);</pre>
      </section>
    </div>
  );
}

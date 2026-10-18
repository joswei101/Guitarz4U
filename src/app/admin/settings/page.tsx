import { requirePermissionPage } from "@/lib/auth/guards";
import { env, features } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import { saveSettingsAction } from "@/app/actions/admin/misc";
import { AdminHeader, Table } from "@/components/admin/admin-ui";
import { ActionForm } from "@/components/forms/action-form";
import { Badge, Card } from "@/components/ui/misc";
import { Checkbox, Field, Textarea } from "@/components/ui/form";

export const metadata = { title: "Settings" };

export default async function SettingsAdmin() {
  await requirePermissionPage("settings:manage");
  const [types, accepting, warranty] = await Promise.all([getSetting("sell.acceptedTypes"), getSetting("repairs.acceptingRequests"), getSetting("repairs.defaultWarrantyTerms")]);
  const e = env();
  const integrations: [string, boolean, string][] = [
    ["Card payments (PayFast)", features.payfast(), features.payfast() ? `${e.PAYFAST_MODE} mode` : "Set PAYFAST_MERCHANT_ID / KEY / PASSPHRASE"],
    ["Transactional email (SMTP)", features.email(), features.email() ? `${e.SMTP_HOST}` : "Set SMTP_* and EMAIL_FROM"],
    ["File storage", true, e.STORAGE_DRIVER === "s3" ? `S3-compatible bucket ${e.S3_BUCKET}` : "Local disk (use S3/R2 in production)"],
    ["WhatsApp Business Cloud API", features.whatsapp(), features.whatsapp() ? "Configured — messages only sent to opted-in customers" : "Optional — manual WhatsApp links are used"],
    ["AI price estimates", features.aiPricing(), features.aiPricing() ? `Model ${e.AI_PRICING_MODEL}` : "Optional — set ANTHROPIC_API_KEY"],
    ["Scheduled maintenance", Boolean(e.CRON_SECRET), e.CRON_SECRET ? "CRON_SECRET set — schedule /api/cron/maintenance" : "Set CRON_SECRET and a scheduler"],
  ];
  return (
    <div className="max-w-4xl space-y-6">
      <AdminHeader title="Settings" />
      <Card>
        <h2 className="font-display text-lg uppercase">Integration status</h2>
        <p className="mt-1 text-xs text-bone-dim">Read from server environment variables. Nothing is shown as live unless it is configured.</p>
        <div className="mt-3"><Table><tbody>{integrations.map(([n, ok, d]) => <tr key={n}><td>{n}</td><td><Badge tone={ok ? "ok" : "warn"}>{ok ? "configured" : "not configured"}</Badge></td><td className="text-xs">{d}</td></tr>)}</tbody></Table></div>
      </Card>
      <Card>
        <h2 className="font-display text-lg uppercase">Business settings</h2>
        <ActionForm action={saveSettingsAction} submitLabel="Save settings" className="mt-3 space-y-4">
          <Field label="Item types accepted on the Sell Your Guitar form (one per line)" htmlFor="acceptedTypes" hint="Only these appear on the form. Other parts/equipment aren't accepted automatically."><Textarea id="acceptedTypes" name="acceptedTypes" defaultValue={types.join("\n")} className="min-h-48" /></Field>
          <Checkbox id="acceptingRepairs" name="acceptingRepairs" defaultChecked={accepting} label="Accepting new repair requests" />
          <Field label="Default repair warranty wording (pre-fills new quotes)" htmlFor="warrantyTerms"><Textarea id="warrantyTerms" name="warrantyTerms" defaultValue={warranty} /></Field>
        </ActionForm>
      </Card>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { ConfirmCheckboxForm, SettingsForm } from "@/components/admin/AdminForms";
import { deleteBrandAction, removeDemoDataAction, renameBrandAction, saveReservationSettingsAction } from "@/app/admin/actions";
import { getSiteSettings } from "@/lib/settings";
import { isEmailConfigured } from "@/lib/email";
import { GOOGLE_AUTH_ENABLED, SITE_URL, SUPABASE_URL } from "@/lib/env";

export const metadata = { title: "Settings" };

function Status({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return <span className={`badge ${ok ? "badge-success" : "badge-warning"}`}>{ok ? yes : no}</span>;
}

export default async function AdminSettings() {
  const supabase = await createClient();
  const settings = await getSiteSettings();
  const [{ count: demo }, { data: brands }, { data: productBrands }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_demo", true),
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("products").select("brand_id"),
  ]);
  const used = new Map<number, number>();
  for (const p of (productBrands ?? []) as { brand_id: number | null }[]) if (p.brand_id) used.set(p.brand_id, (used.get(p.brand_id) ?? 0) + 1);
  const serviceKey = Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div className="max-w-4xl space-y-8">
      <AdminPageHeader title="Settings" />

      <section className="card p-5">
        <h2 className="text-xl">Integrations status</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex flex-wrap items-center justify-between gap-2">
            Online payments <span className="badge badge-neutral">Not used — by design (private EFT only)</span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2">
            Email notifications (SMTP) <Status ok={isEmailConfigured()} yes="Configured" no="Not configured — in-app only" />
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2">
            Google sign-in <Status ok={GOOGLE_AUTH_ENABLED} yes="Enabled" no="Disabled (button hidden)" />
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2">
            Server secret key (needed to delete auth accounts) <Status ok={serviceKey} yes="Present" no="Missing" />
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2">
            Automated WhatsApp messages <span className="badge badge-neutral">Not used — WhatsApp links only</span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2">
            Analytics <span className="badge badge-success">First-party, anonymous counts</span>
          </li>
          <li className="text-xs text-ink-soft">
            Site URL: {SITE_URL} · Supabase: {SUPABASE_URL.replace(/^https?:\/\//, "")}
          </li>
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="text-xl">Reservations</h2>
        <div className="mt-3">
          <SettingsForm action={saveReservationSettingsAction}>
            <div className="field max-w-xs">
              <label htmlFor="hold_days" className="label">
                Default hold period (days)
              </label>
              <input id="hold_days" name="hold_days" type="number" min={1} max={30} defaultValue={settings.reservations.hold_days} className="input" />
            </div>
          </SettingsForm>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-xl">Brands</h2>
        <p className="mt-1 text-sm text-ink-soft">Brands are created automatically when you type a new one on a product. Rename or remove unused brands here.</p>
        <ul className="mt-3 divide-y divide-line">
          {((brands ?? []) as { id: number; name: string }[]).map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-2 py-2">
              <form action={renameBrandAction} className="flex flex-1 gap-2">
                <input type="hidden" name="id" value={b.id} />
                <label className="sr-only" htmlFor={`brand-${b.id}`}>
                  Brand name
                </label>
                <input id={`brand-${b.id}`} name="name" defaultValue={b.name} maxLength={60} className="input h-9 min-h-0 py-1 text-sm" />
                <button className="btn btn-outline btn-sm">Rename</button>
              </form>
              <span className="text-xs text-ink-soft">{used.get(b.id) ?? 0} product(s)</span>
              {!used.get(b.id) && (
                <form action={deleteBrandAction}>
                  <input type="hidden" name="id" value={b.id} />
                  <button className="btn btn-sm text-danger hover:bg-danger-bg">Delete</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card border-danger/30 p-5">
        <h2 className="text-xl">Demonstration data</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {demo ? `${demo} demonstration listing(s) are in your shop.` : "There is no demonstration data. Your shop contains only your own listings."}
        </p>
        {Boolean(demo) && (
          <div className="mt-3">
            <ConfirmCheckboxForm action={removeDemoDataAction} hidden={{}} checkboxLabel="Permanently delete all demonstration listings." submitLabel="Remove demo data" danger />
          </div>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { SettingsForm } from "@/components/admin/AdminForms";
import { PageContentEditor } from "@/components/admin/PageContentEditor";
import { saveAnnouncementAction, saveContactSettingsAction, saveRepairPricesAction } from "@/app/admin/actions";
import { getSiteSettings } from "@/lib/settings";
import { DEFAULT_PAGES } from "@/content/pages";
import { REPAIR_SERVICES } from "@/lib/constants";

export const metadata = { title: "Website content" };

export default async function AdminContent({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page = "about" } = await searchParams;
  const settings = await getSiteSettings();
  const current = DEFAULT_PAGES[page] ?? DEFAULT_PAGES.about;
  const override = settings.pages[current.slug];

  return (
    <div className="max-w-5xl space-y-8">
      <AdminPageHeader title="Website content" description="Edit the text on your website without touching code. Changes appear immediately." />

      <section className="card p-5">
        <h2 className="text-xl">Pages</h2>
        <nav aria-label="Choose a page" className="mt-3 flex flex-wrap gap-1.5">
          {Object.values(DEFAULT_PAGES).map((p) => (
            <Link
              key={p.slug}
              href={`/admin/content?page=${p.slug}`}
              className={`rounded-full px-3 py-1.5 text-sm no-underline ${p.slug === current.slug ? "bg-walnut text-cream-light" : "bg-cream text-walnut hover:bg-gold-light/40"}`}
            >
              {p.title}
              {settings.pages[p.slug] ? " (edited)" : ""}
            </Link>
          ))}
        </nav>
        {current.draftLegal && (
          <p className="notice notice-strong mt-4 text-sm">
            This is a draft legal document. Have it reviewed by a qualified person (POPIA, CPA, ECTA) before launch.
          </p>
        )}
        <div className="mt-4">
          <PageContentEditor key={current.slug} slug={current.slug} body={override ?? current.body} edited={Boolean(override)} />
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          Formatting: <code>## Heading</code>, <code>### Smaller heading</code>, <code>- bullet</code>, <code>1. numbered</code>, <code>**bold**</code>,{" "}
          <code>*italic*</code>, <code>[link text](/shop)</code>, <code>&gt; highlighted note</code>.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="text-xl">Announcement bar</h2>
        <div className="mt-3">
          <SettingsForm action={saveAnnouncementAction}>
            <div className="field">
              <label htmlFor="ann" className="label">
                Text
              </label>
              <input id="ann" name="text" maxLength={200} defaultValue={settings.announcement.text} className="input" placeholder="e.g. New stock arriving this week!" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="enabled" defaultChecked={settings.announcement.enabled} className="h-4 w-4" /> Show announcement at the top of every page
            </label>
          </SettingsForm>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-xl">Contact details</h2>
        <div className="mt-3">
          <SettingsForm action={saveContactSettingsAction}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp number" name="whatsapp_display" value={settings.contact.whatsapp_display} />
              <Field label="Email address" name="email" value={settings.contact.email} type="email" />
              <Field label="Social media handle" name="social_handle" value={settings.contact.social_handle} />
              <Field label="Area shown publicly (never your exact address)" name="location_label" value={settings.contact.location_label} />
              <Field label="Hours notice" name="hours_notice" value={settings.contact.hours_notice} />
            </div>
            <div className="field">
              <label htmlFor="social_links" className="label">
                Social media links (optional, one per line: <code>Label | https://…</code>)
              </label>
              <textarea
                id="social_links"
                name="social_links"
                rows={3}
                className="textarea min-h-0"
                defaultValue={settings.contact.social_links.map((l) => `${l.label} | ${l.url}`).join("\n")}
                placeholder="Instagram | https://www.instagram.com/your-handle"
              />
            </div>
          </SettingsForm>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-xl">Repair prices (optional)</h2>
        <p className="mt-1 text-sm text-ink-soft">Leave blank to show &ldquo;Quoted after assessment&rdquo;. Prices are only shown if you tick the box.</p>
        <div className="mt-3">
          <SettingsForm action={saveRepairPricesAction}>
            <div className="grid gap-3 sm:grid-cols-2">
              {REPAIR_SERVICES.map((s) => (
                <Field
                  key={s.id}
                  label={s.name}
                  name={`price_${s.id}`}
                  value={settings.repair_prices.items.find((i) => i.service === s.id)?.price ?? ""}
                  placeholder="e.g. From R350"
                  required={false}
                />
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="show" defaultChecked={settings.repair_prices.show} className="h-4 w-4" /> Show these prices on the repairs page
            </label>
          </SettingsForm>
        </div>
      </section>
    </div>
  );
}

function Field({ label, name, value, type = "text", placeholder, required = true }: { label: string; name: string; value: string; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div className="field">
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input id={name} name={name} type={type} defaultValue={value} placeholder={placeholder} required={required} className="input" />
    </div>
  );
}

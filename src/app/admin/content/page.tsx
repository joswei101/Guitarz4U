import { createClient } from "@/lib/supabase/server";
import { AdminTitle } from "@/components/admin/AdminUi";
import { HeroImageForm, RepairPricesForm, SettingsTextForm } from "@/components/admin/ContentForms";
import { ABOUT_DEFAULT, HERO_DEFAULT, REPAIRS_INTRO_DEFAULT } from "@/content/copy";
import type { RepairPrice } from "@/lib/settings";

export const metadata = { title: "Website content" };

export default async function ContentPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("key, value");
  const v = Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<string, unknown>;
  const s = (k: string) => (typeof v[k] === "string" ? (v[k] as string) : null);
  return (
    <div className="max-w-4xl space-y-6">
      <AdminTitle title="Website content">Edit text without touching code. Leave a box empty to use the default wording (shown greyed out).</AdminTitle>
      <SettingsTextForm
        title="Announcement bar"
        description="Optional message shown at the very top of every page (e.g. “Closed for the holidays until 6 January”)."
        fields={[{ key: "announcement", label: "Announcement", value: s("announcement"), placeholder: "No announcement" }]}
      />
      <SettingsTextForm
        title="Home page"
        fields={[
          { key: "hero_title", label: "Headline", value: s("hero_title"), placeholder: HERO_DEFAULT.title },
          { key: "hero_subtitle", label: "Introduction", value: s("hero_subtitle"), placeholder: HERO_DEFAULT.subtitle, rows: 3 },
        ]}
      />
      <HeroImageForm current={s("hero_image_path")} />
      <SettingsTextForm title="About page" description="Markdown supported: ## Heading, **bold**, - bullet." fields={[{ key: "about_body", label: "About text", value: s("about_body"), placeholder: ABOUT_DEFAULT, rows: 14 }]} />
      <SettingsTextForm title="Repairs page" fields={[{ key: "repairs_intro", label: "Introduction", value: s("repairs_intro"), placeholder: REPAIRS_INTRO_DEFAULT, rows: 3 }]} />
      <RepairPricesForm prices={(Array.isArray(v.repair_prices) ? v.repair_prices : []) as RepairPrice[]} />
      <SettingsTextForm
        title="Policies"
        description="Leave empty to use the built-in DRAFT policies (shown with a “draft” notice). Paste your reviewed versions here before launch. Markdown supported."
        fields={[
          { key: "policy_privacy", label: "Privacy policy", value: s("policy_privacy"), placeholder: "Using the built-in draft privacy policy", rows: 8 },
          { key: "policy_terms", label: "Terms & conditions", value: s("policy_terms"), placeholder: "Using the built-in draft terms", rows: 8 },
          { key: "policy_returns", label: "Returns, condition & reservations", value: s("policy_returns"), placeholder: "Using the built-in draft policy", rows: 8 },
        ]}
      />
    </div>
  );
}

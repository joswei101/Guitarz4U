import "server-only";
import { DEFAULT_PAGES, type EditablePage } from "@/content/pages";
import { getSiteSettings } from "@/lib/settings";

/** Returns an editable page, using the owner's saved version if there is one. */
export async function getEditablePage(slug: string): Promise<EditablePage> {
  const base = DEFAULT_PAGES[slug];
  const settings = await getSiteSettings();
  const override = settings.pages[slug];
  return { ...base, body: override && override.trim() ? override : base.body };
}

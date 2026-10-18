import { cache } from "react";
import { query } from "./db";

// Editable website content and settings. Defaults are used until the owner
// changes them in Admin → Content & settings. No code edits needed.
export const DEFAULT_SETTINGS = {
  businessName: "Guitarz4U",
  tagline: "Second-hand equipment, first-hand service.",
  whatsappNumber: "064 856 7019",
  email: "Joshuaweinfas@gmail.com",
  socialHandle: "Shuaweinfas",
  // Full profile link (e.g. https://www.instagram.com/Shuaweinfas). Left empty until the owner confirms the platform.
  socialUrl: "",
  locationLine: "Sandringham, Johannesburg, Gauteng",
  hoursNotice: "Closed on Saturdays.",
  announcement: "",
  heroHeading: "Pre-owned guitars, honestly described.",
  heroText:
    "Guitarz4U buys and sells second-hand electric, bass, acoustic and classical guitars in Johannesburg. Every listing discloses its condition and known defects, and every sale is arranged personally — no online payments, no surprises.",
  aboutText:
    "Guitarz4U is a small, owner-run guitar business based in Sandringham, Johannesburg. We buy and sell second-hand guitars — working, broken and incomplete — and offer repairs, setups and restring services.\n\nEvery purchase is handled personally. Instead of an online checkout, you send a purchase request, we confirm the instrument is still available, and we arrange payment and collection with you directly.",
  repairsIntro:
    "From a fresh set of strings to electronics and fretwork, tell us what your guitar needs and we will assess it and send you a quote before any work begins.",
  repairPricesNote: "",
  reservationDays: 3,
  sellIntro:
    "We are interested in working, broken and incomplete guitars. Tell us about yours and we will get back to you personally. Please note: we do not buy loose guitar parts on their own.",
};

export type SiteSettings = typeof DEFAULT_SETTINGS;
export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[];

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const settings: SiteSettings = { ...DEFAULT_SETTINGS };
  try {
    const rows = await query<{ key: string; value: unknown }>("select key, value from site_settings");
    for (const row of rows) {
      if (row.key in settings) (settings as Record<string, unknown>)[row.key] = row.value;
    }
  } catch (err) {
    console.error("[settings] falling back to defaults", err);
  }
  return settings;
});

/** "064 856 7019" → "27648567019" for wa.me links. */
export function whatsappDigits(local: string): string {
  const digits = local.replace(/\D/g, "");
  return digits.startsWith("0") ? "27" + digits.slice(1) : digits;
}

export function whatsappLink(number: string, text?: string): string {
  return `https://wa.me/${whatsappDigits(number)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

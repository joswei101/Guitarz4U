import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type ContactSettings = {
  whatsapp_number: string;
  whatsapp_display: string;
  email: string;
  social_handle: string;
  social_links: { label: string; url: string }[];
  location_label: string;
  hours_notice: string;
};

export type SiteSettings = {
  contact: ContactSettings;
  reservations: { hold_days: number };
  announcement: { enabled: boolean; text: string };
  repair_prices: { show: boolean; items: { service: string; price: string }[] };
  pages: Record<string, string>;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  contact: {
    whatsapp_number: "27648567019",
    whatsapp_display: "064 856 7019",
    email: "Joshuaweinfas@gmail.com",
    social_handle: "Shuaweinfas",
    social_links: [],
    location_label: "Sandringham, Johannesburg, Gauteng",
    hours_notice: "Closed on Saturdays",
  },
  reservations: { hold_days: 3 },
  announcement: { enabled: false, text: "" },
  repair_prices: { show: false, items: [] },
  pages: {},
};

/** Loads public site settings (with safe defaults if the database is unreachable). */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  if (!isSupabaseConfigured()) return DEFAULT_SETTINGS;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("site_settings").select("key, value").eq("is_public", true);
    if (error || !data) return DEFAULT_SETTINGS;
    const map = Object.fromEntries(data.map((row: { key: string; value: unknown }) => [row.key, row.value]));
    const pages: Record<string, string> = {};
    for (const [key, value] of Object.entries(map)) {
      if (key.startsWith("page:") && value && typeof value === "object" && "body" in value) {
        pages[key.slice(5)] = String((value as { body: string }).body);
      }
    }
    return {
      contact: { ...DEFAULT_SETTINGS.contact, ...(map.contact ?? {}) },
      reservations: { ...DEFAULT_SETTINGS.reservations, ...(map.reservations ?? {}) },
      announcement: { ...DEFAULT_SETTINGS.announcement, ...(map.announcement ?? {}) },
      repair_prices: { ...DEFAULT_SETTINGS.repair_prices, ...(map.repair_prices ?? {}) },
      pages,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
});

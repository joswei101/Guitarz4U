import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { BUSINESS } from "@/lib/constants";

export type RepairPrice = { service: string; price: string; note?: string };

export type SiteSettings = {
  whatsapp_number: string;
  contact_email: string;
  social_handle: string;
  closed_notice: string;
  announcement: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image_path: string | null;
  about_body: string | null;
  repairs_intro: string | null;
  repair_prices: RepairPrice[];
  policy_privacy: string | null;
  policy_terms: string | null;
  policy_returns: string | null;
  reservation_hold_days: number;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  whatsapp_number: BUSINESS.whatsapp,
  contact_email: BUSINESS.email,
  social_handle: BUSINESS.socialHandle,
  closed_notice: BUSINESS.closedNotice,
  announcement: null,
  hero_title: null,
  hero_subtitle: null,
  hero_image_path: null,
  about_body: null,
  repairs_intro: null,
  repair_prices: [],
  policy_privacy: null,
  policy_terms: null,
  policy_returns: null,
  reservation_hold_days: 3,
};

/** Public site settings, merged over safe defaults. Never throws. */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_settings").select("key, value").eq("is_public", true);
    const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const row of data ?? []) {
      if (row.value !== null && row.value !== undefined) merged[row.key] = row.value;
    }
    return merged as SiteSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
});

import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

export type Settings = Database['public']['Tables']['settings']['Row'];

// Used if the database cannot be reached, so pages still show contact details.
export const FALLBACK_SETTINGS: Settings = {
  id: 1,
  business_name: 'Guitarz4U',
  contact_email: 'Joshuaweinfas@gmail.com',
  whatsapp_display: '064 856 7019',
  whatsapp_international: '27648567019',
  social_handle: 'Shuaweinfas',
  collection_area: 'Sandringham, Johannesburg',
  owner_notification_email: 'Joshuaweinfas@gmail.com',
  reservation_hours: 48,
  max_active_reservations_per_customer: 2,
  repair_warranty_days: null,
  repair_warranty_terms: '',
  shop_notice: '',
  legal_reviewed: false,
  updated_at: new Date(0).toISOString(),
};

export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    return data ?? FALLBACK_SETTINGS;
  } catch {
    return FALLBACK_SETTINGS;
  }
});

export type ContentBlock = { key: string; title: string; body: string; is_draft: boolean; is_legal: boolean; updated_at: string };

export const getContent = cache(async (key: string): Promise<ContentBlock | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('site_content')
    .select('key, title, body, is_draft, is_legal, updated_at')
    .eq('key', key)
    .maybeSingle();
  if (!data) return null;
  const settings = await getSettings();
  return { ...data, body: fillTokens(data.body, settings) };
});

/** Replaces {{tokens}} in editable content with live settings values. */
export function fillTokens(text: string, s: Settings): string {
  const warranty = s.repair_warranty_days === null
    ? '**The repair warranty period has not been set yet.** *(Owner: set it in Admin → Settings before launch.)*'
    : s.repair_warranty_days === 0
      ? 'Repairs are not covered by an additional warranty beyond your statutory rights.'
      : `Our workmanship on repairs is guaranteed for **${s.repair_warranty_days} days** from the date the repair is completed.`;
  const map: Record<string, string> = {
    business_name: s.business_name,
    contact_email: s.contact_email,
    whatsapp: s.whatsapp_display,
    collection_area: s.collection_area,
    reservation_hours: String(s.reservation_hours),
    warranty,
    warranty_terms: s.repair_warranty_terms || '',
    social_handle: s.social_handle,
  };
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k: string) => map[k] ?? m);
}

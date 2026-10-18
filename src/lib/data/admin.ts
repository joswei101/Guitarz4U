import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Private settings (collection address, bank details) — readable by admins only (RLS). */
export async function getPrivateSnippets() {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("key, value").in("key", ["collection_address", "bank_details"]);
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, typeof r.value === "string" ? r.value : null]));
  const out: { label: string; text: string }[] = [];
  if (map.collection_address) out.push({ label: "Collection address", text: `Collection address: ${map.collection_address}` });
  if (map.bank_details) out.push({ label: "Bank details", text: `Payment details (EFT):\n${map.bank_details}\n\nPlease use your reference number as the payment reference.` });
  return out;
}

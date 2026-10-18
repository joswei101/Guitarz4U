import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getStatusEvents(entityType: string, entityId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("status_events")
    .select("id, to_status, note, created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at");
  return data ?? [];
}

/** Short-lived signed URLs for private photos (owner or admin only, enforced by storage policies). */
export async function signedUrls(bucket: string, paths: string[]) {
  if (!paths.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 60 * 60);
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
}

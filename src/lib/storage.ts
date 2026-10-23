import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Short-lived signed URLs for private customer uploads (RLS limits who can sign). */
export async function signedUploadUrls(paths: string[], expiresIn = 3600): Promise<{ path: string; url: string | null }[]> {
  if (!paths.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage.from("customer-uploads").createSignedUrls(paths, expiresIn);
  return paths.map((path) => ({ path, url: data?.find((d) => d.path === path)?.signedUrl ?? null }));
}

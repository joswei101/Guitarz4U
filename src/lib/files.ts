import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Creates short-lived (10 minute) links to private uploaded files. Callers must
 * only pass rows they fetched with the visitor's own (RLS-restricted) client,
 * so a customer can never get links to someone else's files.
 */
export async function signedFileUrls(rows: { id: string; path: string; mime_type: string }[]) {
  if (!rows.length) return [];
  const admin = createAdminClient();
  const { data } = await admin.storage.from('submissions').createSignedUrls(rows.map((r) => r.path), 600);
  return rows.map((r, i) => ({ ...r, url: data?.[i]?.signedUrl ?? null }));
}

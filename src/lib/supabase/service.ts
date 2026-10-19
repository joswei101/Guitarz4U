import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

// Privileged client using the SECRET (service role) key. It bypasses row level
// security, so it is used only in a handful of administrator-only server
// actions (deleting an auth account for a POPIA deletion request) after the
// caller has been verified as an administrator.
export function createServiceClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

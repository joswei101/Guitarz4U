import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | undefined;

// Browser Supabase client (used for direct image uploads to Storage and a few
// lightweight interactions). Uses only the public publishable key.
export function createClient() {
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }
  return client;
}

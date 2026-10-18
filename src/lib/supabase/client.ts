"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/lib/database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Browser Supabase client (uses the visitor's session; RLS applies). */
export function createClient() {
  if (!client) client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY);
  return client;
}

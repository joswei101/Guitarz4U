import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { SUPABASE_URL } from '@/lib/env';

/**
 * Privileged Supabase client using the SECRET key. It bypasses row-level
 * security, so it is only used on the server, only after the website has
 * validated the input and checked who is asking. Never import this into a
 * client component ("server-only" makes the build fail if you try).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !key) {
    throw new Error('SUPABASE_SECRET_KEY is not configured (see .env.example).');
  }
  return createClient<Database>(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

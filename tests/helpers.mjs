// Shared helpers for tests that run against the LOCAL Supabase stack
// (start it with `npx supabase start`). Never point these at production.
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

// Keys are read from the running local stack (`supabase status`), never hardcoded.
function localStatus() {
  try {
    const out = execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return Object.fromEntries(out.split('\n').map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]));
  } catch {
    throw new Error('Local Supabase is not running. Start it with: npx supabase start');
  }
}
const status = process.env.TEST_SUPABASE_SECRET_KEY ? {} : localStatus();

export const URL = process.env.TEST_SUPABASE_URL ?? status.API_URL ?? 'http://127.0.0.1:54321';
export const PUBLISHABLE = process.env.TEST_SUPABASE_PUBLISHABLE_KEY ?? status.PUBLISHABLE_KEY;
export const SECRET = process.env.TEST_SUPABASE_SECRET_KEY ?? status.SECRET_KEY;
export const DB_URL = process.env.TEST_DB_URL ?? status.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

if (!/127\.0\.0\.1|localhost/.test(URL)) throw new Error('Tests must only run against a local Supabase stack.');

export const admin = createClient(URL, SECRET, { auth: { persistSession: false } });
export const anon = () => createClient(URL, PUBLISHABLE, { auth: { persistSession: false } });

export function psql(sql) {
  return execFileSync('psql', [DB_URL, '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql], { encoding: 'utf8' }).trim();
}

export const PASSWORD = 'Test-password-123';
export const unique = () => Math.random().toString(36).slice(2, 8);

/** Creates a confirmed user and (optionally) sets their role/permissions. */
export async function makeUser(label, role = 'customer', permissions = []) {
  const email = `${label}-${unique()}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: `Test ${label}` } });
  if (error) throw error;
  if (role !== 'customer') {
    psql(`update public.profiles set role='${role}', permissions=array[${permissions.map((p) => `'${p}'`).join(',')}]::text[] where id='${data.user.id}'`);
  }
  return { id: data.user.id, email };
}

export async function signedIn(email) {
  const c = anon();
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return c;
}

/** Inserts a published product directly (test fixture — local database only). */
export function makeProduct(overrides = {}) {
  const p = { brand: 'TestBrand', model: 'Model ' + unique(), category: 'electric', condition: 'good', price: 2500, status: 'available', ...overrides };
  return psql(`insert into public.products (slug, brand, model, category, condition, price, status, description_approved)
    values ('test-${unique()}-${unique()}', '${p.brand}', '${p.model}', '${p.category}', '${p.condition}', ${p.price}, '${p.status}', true) returning id`).split('\n')[0];
}

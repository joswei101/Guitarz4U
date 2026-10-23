// Shared helpers for integration tests that run against a LOCAL Supabase
// stack (`npx supabase start`). Never point these tests at production: they
// create and delete users and data.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

function loadEnv() {
  const env = { ...process.env };
  if (fs.existsSync(".env.local")) {
    for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  }
  return env;
}

export const env = loadEnv();
export const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = env.SUPABASE_SECRET_KEY;

if (!URL || !URL.includes("127.0.0.1") && !URL.includes("localhost")) {
  throw new Error("Integration tests must run against a local Supabase instance (NEXT_PUBLIC_SUPABASE_URL must be localhost).");
}

export const service = createClient(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
export const anon = () => createClient(URL, PUBLISHABLE, { auth: { persistSession: false, autoRefreshToken: false } });

const run = Date.now().toString(36);
let counter = 0;

/** Creates a confirmed user and returns a client signed in as them. */
export async function makeUser({ admin = false, name = "Test User" } = {}) {
  const email = `test-${run}-${counter++}@example.com`;
  const password = "Passw0rd!" + run;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, phone: "082 555 0000" },
  });
  if (error) throw error;
  if (admin) {
    const { error: e2 } = await service.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
    if (e2) throw e2;
  }
  const client = anon();
  const { error: e3 } = await client.auth.signInWithPassword({ email, password });
  if (e3) throw e3;
  return { id: data.user.id, email, password, client };
}

let productCounter = 0;
export async function makeProduct(overrides = {}) {
  const { data: cat } = await service.from("categories").select("id").eq("slug", "electric").single();
  const slug = `test-product-${run}-${productCounter++}`;
  const { data, error } = await service
    .from("products")
    .insert({ slug, title: `Test guitar ${slug}`, category_id: cat.id, price: 1000 + productCounter, condition: "good", status: "published", ...overrides })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function productStatus(id) {
  const { data } = await service.from("products").select("status").eq("id", id).single();
  return data?.status;
}

export const contact = { p_contact_name: "Test Customer", p_contact_email: "customer@example.com", p_contact_phone: "082 555 0000", p_preferred_contact: "whatsapp", p_message: "Hello" };

export async function cleanup() {
  // Remove test users (cascades to their personal rows) and test products.
  const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) if (u.email?.startsWith(`test-${run}-`)) await service.auth.admin.deleteUser(u.id);
  await service.from("purchase_request_items").update({ product_id: null }).like("title_snapshot", `Test guitar test-product-${run}%`);
  await service.from("products").delete().like("slug", `test-product-${run}-%`);
}

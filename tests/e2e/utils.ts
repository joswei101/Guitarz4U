import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env: Record<string, string> = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
if (!env.NEXT_PUBLIC_SUPABASE_URL.includes("127.0.0.1") && !env.NEXT_PUBLIC_SUPABASE_URL.includes("localhost")) {
  throw new Error("E2E tests must use a local Supabase instance.");
}

export const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
export const MAILPIT = "http://127.0.0.1:54324";
export const RUN = Date.now().toString(36);
export const PASSWORD = "Guitar1234!";

/** Waits for an email to arrive in the local Mailpit inbox and returns its first link matching `pattern`. */
export async function waitForEmailLink(to: string, subjectIncludes: string, pattern = /href="([^"]*auth\/confirm[^"]*)"/): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const json = (await res.json()) as { messages: { ID: string; Subject: string }[] };
    const msg = json.messages?.find((m) => m.Subject.includes(subjectIncludes));
    if (msg) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json()) as { HTML: string };
      const m = pattern.exec(full.HTML);
      if (m) return m[1].replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No "${subjectIncludes}" email for ${to}`);
}

export async function emailCount(to: string, subjectIncludes: string) {
  const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
  const json = (await res.json()) as { messages: { Subject: string }[] };
  return json.messages?.filter((m) => m.Subject.includes(subjectIncludes)).length ?? 0;
}

/** Creates a confirmed account directly (for tests that don't exercise registration). */
export async function createUser(email: string, name: string, admin = false) {
  const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: name, phone: "082 555 1234" } });
  if (error) throw error;
  if (admin) await service.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
  return data.user.id;
}

export async function login(page: Page, email: string, next = "/account") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

/** Creates a published product with a demo image. */
export async function createProduct(title: string, price = 2500) {
  const { data: cat } = await service.from("categories").select("id").eq("slug", "acoustic").single();
  const slug = `e2e-${RUN}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await service
    .from("products")
    .insert({ slug, title, category_id: cat!.id, price, condition: "very_good", status: "published", description: "E2E test guitar", defects: "Small ding on the back." })
    .select("id, slug")
    .single();
  if (error) throw error;
  await service.from("product_images").insert({ product_id: data.id, storage_path: "/demo/acoustic.svg", alt_text: title, sort_order: 0 });
  return data as { id: string; slug: string };
}

export async function expectNoPaymentUi(page: Page) {
  const html = (await page.content()).toLowerCase();
  for (const word of ["payfast", "stripe", "paypal", "card number", "cvv", "pay now", "checkout.js"]) {
    expect(html, `page must not contain "${word}"`).not.toContain(word);
  }
  await expect(page.locator('input[autocomplete="cc-number"], input[name*="card" i]')).toHaveCount(0);
}

/** Real photo fixtures for upload tests. */
export function photoFile(kind: "jpg" | "png" = "jpg") {
  return kind === "jpg" ? "tests/e2e/fixtures/guitar-photo.jpg" : "tests/e2e/fixtures/plain.png";
}

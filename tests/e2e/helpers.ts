import { execFileSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import "../load-env.mjs";

export const SUPABASE_URL = "http://127.0.0.1:54321";
const SECRET = process.env.TEST_SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY || "";
const DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const MAILPIT = "http://127.0.0.1:54324";

export const service = createClient(SUPABASE_URL, SECRET, { auth: { persistSession: false } });
export const runId = Date.now().toString(36);
export const PASSWORD = "Guitar-test-123";
export const FIXTURE_IMAGE = "public/icons/icon-512.png";

export const sql = (q: string) => execFileSync("psql", [DB_URL, "-At", "-c", q], { encoding: "utf8" }).trim();

export async function createUser(label: string, opts: { admin?: boolean } = {}) {
  const email = `${label}-${runId}@test.local`;
  const { error } = await service.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `${label[0].toUpperCase()}${label.slice(1)} Tester` },
  });
  if (error) throw error;
  if (opts.admin) sql(`select public.promote_to_admin('${email}')`);
  return email;
}

export async function login(page: Page, email: string, password = PASSWORD, next = "/account") {
  await page.context().clearCookies();
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address").fill(email);
  await page.locator("input[name=password]").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => u.pathname === next.split("?")[0]);
}

type MailSummary = { ID: string; To: { Address: string }[]; Subject: string; Created: string };

/** Waits for an email to `to` in the local Mailpit inbox and returns its text. */
export async function waitForEmail(to: string, subjectMatch?: RegExp, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const json = (await res.json()) as { messages: MailSummary[] };
    const msg = json.messages?.find((m) => !subjectMatch || subjectMatch.test(m.Subject));
    if (msg) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json()) as { Text: string; HTML: string; Subject: string };
      return full;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email to ${to} matching ${subjectMatch}`);
}

export function firstLink(text: string) {
  const m = text.match(/https?:\/\/[^\s"<>)\]]+/);
  if (!m) throw new Error("No link in email");
  return m[0].replace(/&amp;/g, "&");
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page should not scroll sideways").toBeLessThanOrEqual(1);
}

export async function createProductViaDb(title: string, opts: { price?: number; status?: string } = {}) {
  const cat = sql(`select id from public.categories where slug='electric-guitars'`);
  const slug = `${title.toLowerCase().replace(/\W+/g, "-")}-${runId}`;
  const id = sql(
    `insert into public.products (slug, title, category_id, price, condition, status, description) values ('${slug}', '${title}', ${cat}, ${opts.price ?? 4500}, 'very_good', '${opts.status ?? "published"}', 'E2E test listing') returning id`,
  ).split("\n")[0];
  return { id, slug };
}

import { Page, expect } from "@playwright/test";
import { Pool } from "pg";
import fs from "node:fs";

for (const line of fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8").split("\n") : []) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

export const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
export const ADMIN = { email: "owner@guitarz4u.test", password: "AdminPass12345!" };

/** Each test gets its own fake client IP so rate limits don't interfere between tests. */
export async function freshIp(page: Page) {
  const ip = `10.${rand(255)}.${rand(255)}.${rand(255)}`;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": ip });
  return ip;
}
const rand = (n: number) => Math.floor(Math.random() * n);
export const uid = () => Math.random().toString(36).slice(2, 8);

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

export async function register(page: Page, name: string, email: string, password = "CustomerPass123") {
  await page.goto("/register");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/account");
}

/** Public forms reject submissions made faster than a human could fill them in. */
export const humanPause = (page: Page) => page.waitForTimeout(2700);

export async function firstAvailableProduct() {
  const r = await db.query("select id, slug, title, price_cents from products where status='published' order by created_at desc limit 1");
  return r.rows[0] as { id: string; slug: string; title: string; price_cents: number };
}

export async function makeProduct(title: string, status = "published", priceRand = 1234) {
  const cat = await db.query("select id from categories where slug='electric-guitars'");
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + uid();
  const r = await db.query(
    "insert into products (slug,title,category_id,price_cents,condition,status,is_demo,description,defects,serial_number) values ($1,$2,$3,$4,'good',$5,true,'Test description','Test defect: chip on headstock','SERIAL-SECRET-123') returning id, slug",
    [slug, title, cat.rows[0].id, priceRand * 100, status],
  );
  return r.rows[0] as { id: string; slug: string };
}

export async function expectNoPaymentFields(page: Page) {
  const bad = await page.locator('input[name*="card" i], input[autocomplete^="cc-"], input[name*="cvv" i], input[name*="iban" i], input[name*="account_number" i], iframe[src*="pay" i], script[src*="payfast" i], script[src*="stripe" i], script[src*="paypal" i]').count();
  expect(bad).toBe(0);
}

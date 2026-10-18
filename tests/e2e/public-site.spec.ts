import { expect, test } from "@playwright/test";
import { createProductViaDb, expectNoHorizontalScroll, runId } from "./helpers";

const PAGES = ["/", "/shop", "/sell", "/repairs", "/about", "/contact", "/reviews", "/faq", "/how-it-works", "/policies/privacy", "/policies/terms", "/policies/returns", "/login", "/register", "/forgot-password", "/cart"];

test("every public page loads with a title, one h1 and no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));
  for (const path of PAGES) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page).toHaveTitle(/Guitarz4U/);
    await expect(page.locator("h1"), path).toHaveCount(1);
    await expect(page.locator("footer").getByText("Closed on Saturdays.", { exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("custom 404 page returns a real 404", async ({ page }) => {
  const res = await page.goto("/this-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "That page is out of tune" })).toBeVisible();
  const res2 = await page.goto("/shop/no-such-guitar-xyz");
  expect(res2?.status()).toBe(404);
});

test("SEO files: robots, sitemap, manifest and Open Graph image", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain("Sitemap:");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/shop");
  expect((await request.get("/manifest.webmanifest")).ok()).toBeTruthy();
  const og = await request.get("/opengraph-image");
  expect(og.headers()["content-type"]).toContain("image/png");
});

test("no physical address, payment forms or card fields anywhere public", async ({ page }) => {
  for (const path of ["/", "/contact", "/cart", "/how-it-works"]) {
    await page.goto(path);
    await expect(page.locator('input[autocomplete^="cc-"], input[name*="card" i]')).toHaveCount(0);
  }
  await page.goto("/contact");
  await expect(page.getByText(/address is\s+shared privately/i)).toBeVisible();
});

test("shop search, filters and product page with structured data", async ({ page }) => {
  const p = await createProductViaDb(`Searchable Sunburst ${runId}`, { price: 7777 });
  await page.goto(`/shop?q=${encodeURIComponent("Searchable Sunburst")}`);
  await expect(page.getByRole("link", { name: new RegExp(`Searchable Sunburst ${runId}`) })).toBeVisible();
  await page.goto(`/shop?q=Searchable&max=1000`);
  await expect(page.getByText("No items match your filters")).toBeVisible();
  await page.goto(`/shop?category=electric-guitars&condition=very_good&min=7000&max=8000&q=Searchable`);
  await page.getByRole("link", { name: new RegExp(`Searchable Sunburst ${runId}`) }).click();
  await expect(page).toHaveURL(new RegExp(`/shop/${p.slug}`));
  await expect(page.getByText("R 7 777").first()).toBeVisible();
  await expect(page.getByText("Defects & wear")).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(ld!).offers.priceCurrency).toBe("ZAR");
  // recently viewed shows on the shop page afterwards
  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "Recently viewed" })).toBeVisible();
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("menu works and pages fit the screen", async ({ page }) => {
    for (const path of ["/", "/shop", "/sell", "/repairs", "/contact", "/cart", "/register"]) {
      await page.goto(path);
      await expectNoHorizontalScroll(page);
    }
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.locator("#mobile-menu").getByRole("link", { name: "Repairs" }).click();
    await expect(page).toHaveURL(/\/repairs/);
    await expect(page.locator("#mobile-menu")).toHaveCount(0);
  });
});

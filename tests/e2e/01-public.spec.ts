import { test, expect } from "@playwright/test";
import { freshIp, makeProduct, expectNoPaymentFields, uid, db } from "./helpers";

test.beforeEach(async ({ page }) => { await freshIp(page); });

test("home page shows branding, featured products and the EFT notice", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Guitarz4U/);
  await expect(page.locator(".brand-word").first()).toContainText("Guitarz4U");
  await expect(page.getByText("Second-hand equipment, first-hand service").first()).toBeVisible();
  await expect(page.getByTestId("eft-notice")).toContainText("Guitarz4U does not process online payments.");
  await expect(page.getByText("Closed on Saturdays.").first()).toBeVisible();
  await expect(page.getByTestId("product-card").first()).toBeVisible();
  await expectNoPaymentFields(page);
});

test("all public pages load with titles", async ({ page }) => {
  for (const [path, heading] of [
    ["/shop", "Shop guitars"], ["/sell", "Sell your guitar to Guitarz4U"], ["/repairs", "Guitar repairs & setups"],
    ["/about", "About Guitarz4U"], ["/contact", "Contact us"], ["/reviews", "Customer reviews"], ["/faq", "Frequently asked questions"],
    ["/how-it-works", "How buying and selling works"], ["/policies", "Returns, cancellations & reservations"], ["/privacy", "Privacy policy"],
    ["/terms", "Terms and conditions"], ["/cart", "Your request cart"], ["/track", "Track your request"], ["/login", "Log in"], ["/register", "Create an account"],
  ]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expectNoPaymentFields(page);
  }
});

test("custom 404 page", async ({ page }) => {
  const res = await page.goto("/this-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page is out of tune" })).toBeVisible();
});

test("shop search and filters", async ({ page }) => {
  const token = "zebra" + uid();
  const title = `Filtertest Telecaster ${token}`;
  await makeProduct(title, "published", 777);
  await page.goto(`/shop?q=${token}`);
  await expect(page.getByTestId("product-card")).toHaveCount(1);
  await expect(page.getByTestId("product-card")).toContainText(title);
  await page.goto(`/shop?category=classical-guitars&q=${token}`);
  await expect(page.getByText("No guitars match your search")).toBeVisible();
  await page.goto(`/shop?q=${token}&min=700&max=800`);
  await expect(page.getByTestId("product-card")).toHaveCount(1);
  await page.goto(`/shop?q=${token}&min=800`);
  await expect(page.getByTestId("product-card")).toHaveCount(0);
  await page.goto(`/shop?q=${token}&condition=good&sort=price_asc`);
  await expect(page.getByTestId("product-card")).toHaveCount(1);
  await page.goto(`/shop?q=${token}&condition=excellent`);
  await expect(page.getByTestId("product-card")).toHaveCount(0);
  await page.goto(`/shop?q=${token}&category=electric-guitars`);
  await expect(page.getByTestId("product-card")).toHaveCount(1);
  // Brand filter
  const brand = await db.query("insert into brands (name, slug) values ($1,$2) returning id", ["Brand" + token, "brand-" + token]);
  await db.query("update products set brand_id=$1 where title=$2", [brand.rows[0].id, title]);
  await page.goto(`/shop?brand=brand-${token}`);
  await expect(page.getByTestId("product-card")).toHaveCount(1);
  // The filter form submits as GET
  await page.goto("/shop");
  await page.getByRole("searchbox", { name: "Search", exact: true }).fill(token);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(new RegExp(`q=${token}`));
  await expect(page.getByTestId("product-card")).toHaveCount(1);
});

test("product page shows details, defects, notices and never the serial number", async ({ page }) => {
  const p = await makeProduct("Detailtest Les Paul Okapi", "published", 9999);
  await page.goto(`/shop/${p.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Detailtest Les Paul Okapi");
  await expect(page.getByTestId("product-price")).toHaveText("R9 999");
  await expect(page.getByText("Test defect: chip on headstock")).toBeVisible();
  await expect(page.getByText("Second-hand instrument")).toBeVisible();
  await expect(page.getByTestId("eft-notice")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to request cart" })).toBeVisible();
  await expect(page.getByRole("link", { name: /WhatsApp/ }).first()).toHaveAttribute("href", /wa\.me\/27648567019/);
  expect(await page.content()).not.toContain("SERIAL-SECRET-123");
  await expectNoPaymentFields(page);
});

test("draft and sold products are not publicly purchasable", async ({ page }) => {
  const draft = await makeProduct("Drafttest Hidden Guitar", "draft");
  const sold = await makeProduct("Soldtest Gone Guitar", "published");
  const { db } = await import("./helpers");
  await db.query("update products set status='sold', sold_at=now() where id=$1", [sold.id]);
  expect((await page.goto(`/shop/${draft.slug}`))?.status()).toBe(404);
  await page.goto(`/shop/${sold.slug}`);
  await expect(page.getByText("This guitar has been sold")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to request cart" })).toHaveCount(0);
  await page.goto("/shop?q=Soldtest");
  await expect(page.getByTestId("product-card")).toHaveCount(0);
});

test("SEO essentials: sitemap, robots, structured data, Open Graph", async ({ page, request }) => {
  const sm = await request.get("/sitemap.xml");
  expect(sm.ok()).toBeTruthy();
  expect(await sm.text()).toContain("/shop");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  await page.goto("/");
  expect(await page.locator('meta[property="og:image"]').getAttribute("content")).toContain("og-image.jpg");
  expect(await page.locator('script[type="application/ld+json"]').first().textContent()).toContain("MusicStore");
  const manifest = await request.get("/manifest.webmanifest");
  expect((await manifest.json()).name).toBe("Guitarz4U");
});

test("security headers are present", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-powered-by"]).toBeUndefined();
});

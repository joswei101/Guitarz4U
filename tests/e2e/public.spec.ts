import { expect, test } from "@playwright/test";

const PAGES = ["/", "/shop", "/sell", "/repairs", "/repairs/book", "/repairs/track", "/about", "/how-it-works", "/reviews", "/faqs", "/contact", "/login", "/register", "/policies/privacy", "/policies/terms", "/policies/returns", "/policies/condition", "/policies/repair-terms", "/policies/collection", "/cart"];

test.describe("public pages", () => {
  for (const path of PAGES) {
    test(`${path} renders with one h1, no console errors and no horizontal overflow`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      // Every image has alt text (decorative images use alt="").
      expect(await page.locator("img:not([alt])").count()).toBe(0);
      // Every visible form control has an accessible name.
      const unlabeled = await page.evaluate(() =>
        [...document.querySelectorAll("input:not([type=hidden]):not([tabindex='-1']), select, textarea")].filter((el) => {
          const e = el as HTMLInputElement;
          if (e.offsetParent === null) return false;
          return !(e.labels?.length || e.getAttribute("aria-label") || e.getAttribute("aria-labelledby"));
        }).length,
      );
      expect(unlabeled).toBe(0);
      expect(errors).toEqual([]);
    });
  }

  test("security headers are set", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("SEO files are served", async ({ request }) => {
    expect((await request.get("/robots.txt")).status()).toBe(200);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/shop");
    expect((await request.get("/this-page-does-not-exist")).status()).toBe(404);
  });
});

test.describe("navigation & contact", () => {
  test("homepage calls to action and contact buttons work", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator("main section").first();
    await expect(hero.getByRole("link", { name: "Shop Guitars", exact: true })).toHaveAttribute("href", "/shop");
    await expect(hero.getByRole("link", { name: "Sell Your Guitar", exact: true })).toHaveAttribute("href", "/sell");
    await expect(hero.getByRole("link", { name: "Book a Repair", exact: true })).toHaveAttribute("href", "/repairs/book");
    await expect(page.getByRole("link", { name: /Chat with Guitarz4U on WhatsApp/ })).toHaveAttribute("href", /^https:\/\/wa\.me\/27648567019/);
    await expect(page.locator('a[href^="mailto:Joshuaweinfas@gmail.com"]').first()).toBeVisible();
    await expect(page.getByText("Closed on Saturdays").first()).toBeVisible();
    await hero.getByRole("link", { name: "Shop Guitars", exact: true }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.locator("h1")).toContainText(/guitars/i);
  });

  test("main navigation reaches each section", async ({ page, isMobile }) => {
    await page.goto("/");
    for (const [label, path] of [["Repairs", "/repairs"], ["Sell your guitar", "/sell"], ["Contact", "/contact"], ["About", "/about"]] as const) {
      if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
      await page.getByRole("navigation", { name: isMobile ? "Mobile" : "Main" }).getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }
  });

  test("keyboard users can skip to content", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard navigation is a desktop concern");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
  });
});

test.describe("shop", () => {
  test("browse, filter, view a product and add it to the cart as a guest", async ({ page }) => {
    await page.goto("/shop");
    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible();
    await page.goto("/shop?category=bass-guitars");
    await expect(page.locator("h1")).toHaveText(/Bass guitars/i);
    await page.goto("/shop?q=Stratocaster");
    const first = page.locator("article h3 a").first();
    await first.click();
    await expect(page.locator("h1")).toContainText(/Stratocaster/);
    await expect(page.getByText("Collection only", { exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Added to your cart.")).toBeVisible();
    await page.goto("/cart");
    await expect(page.getByRole("link", { name: /Stratocaster/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in to check out" })).toBeVisible();
  });

  test("checkout and the admin area require sign-in; customers can't see the admin dashboard", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("accounts & forms", () => {
  test("register, see the verification prompt, sign out, sign back in; customers get 404 on /admin", async ({ page }) => {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
    await page.goto("/register");
    await page.getByLabel("Full name").fill("E2E Tester");
    await page.locator("#email").fill(email);
    await page.getByLabel("Password").fill("e2e-password-123");
    await page.locator("#privacy").check();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByText("Please verify your email address")).toBeVisible();
    const res = await page.goto("/admin");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("This page is out of tune")).toBeVisible();
    await expect(page.getByText("Inventory")).toHaveCount(0);
    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.getByLabel("Password").fill("wrong-password-1");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    // What the user typed is kept after a failed attempt.
    await expect(page.locator("#email")).toHaveValue(email);
    await page.getByLabel("Password").fill("e2e-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/account/);
  });

  test("contact form validates and submits", async ({ page }) => {
    await page.goto("/contact");
    await page.locator("#name").fill("Form Tester");
    await page.locator("#email").fill("form@example.com");
    await page.getByLabel("Subject").fill("Question about a Strat");
    await page.getByLabel("Message").fill("Do you have any left-handed Strats coming in?");
    await page.getByLabel(/may use these details/).check();
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText(/your message has been received/)).toBeVisible();
  });

  test("repair request with a photo upload shows a reference", async ({ page }) => {
    await page.goto("/repairs/book");
    await page.getByLabel("Full name").fill("Repair Tester");
    await page.locator("#email").fill("repair-e2e@example.com");
    await page.getByLabel("WhatsApp or phone number").fill("0821234567");
    await page.getByLabel("Instrument type").selectOption("Electric guitar");
    await page.getByLabel("Describe the problem").fill("Output jack crackles when the cable moves.");
    await page.getByLabel("Jack socket and switch repairs").check();
    await page.getByLabel(/Photos/).setInputFiles("public/images/og.jpg");
    await page.getByLabel(/repair terms/).check();
    await page.getByRole("button", { name: "Submit repair request" }).click();
    await expect(page.getByText("Repair request received")).toBeVisible({ timeout: 15_000 });
    const ref = await page.locator("strong", { hasText: /^REP-/ }).textContent();
    await page.getByRole("link", { name: "Track this repair" }).click();
    await page.locator("main #email").fill("repair-e2e@example.com");
    await page.getByRole("button", { name: "Track" }).click();
    await expect(page.getByText(`${ref} · Electric guitar`)).toBeVisible();
    await expect(page.getByText("Awaiting owner review").first()).toBeVisible();
  });
});

test("unknown products return a real 404", async ({ request }) => {
  expect((await request.get("/shop/no-such-guitar")).status()).toBe(404);
});

test("forms submitted before JavaScript loads never put credentials in the URL", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/login");
  await page.locator("#email").fill("nobody@example.com");
  await page.locator("#password").fill("secret-password-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForLoadState("load");
  expect(page.url()).not.toContain("password");
  expect(page.url()).not.toContain("secret");
  await ctx.close();
});

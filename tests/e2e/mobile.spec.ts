import { expect, test } from "@playwright/test";

// Runs in the "mobile" project (Pixel 7 viewport).
test("mobile navigation, layout and no horizontal scrolling", async ({ page }) => {
  for (const path of ["/", "/shop", "/sell", "/repairs", "/contact", "/cart", "/login"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  }
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Site menu" });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Repairs" }).click();
  await expect(page).toHaveURL(/\/repairs/);
  await expect(page.getByRole("dialog", { name: "Site menu" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Chat with Guitarz4U on WhatsApp/ })).toBeVisible();
});

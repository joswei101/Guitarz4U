import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" }); // scan the final state, not mid-animation

const PAGES = ["/", "/shop", "/shop/demo-electric-sunburst", "/sell", "/repairs", "/contact", "/faq", "/login", "/register", "/cart", "/reviews"];

for (const path of PAGES) {
  test(`accessibility (WCAG 2 A/AA): ${path}`, async ({ page }) => {
    const res = await page.goto(path);
    test.skip(res?.status() === 404, "demo data not loaded");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  });
}

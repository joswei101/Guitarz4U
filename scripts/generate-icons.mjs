// Renders PNG app icons from src/app/icon.svg using the bundled Chromium.
// Run: node scripts/generate-icons.mjs
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const svg = readFileSync(new URL("../src/app/icon.svg", import.meta.url), "utf8");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
for (const [size, name, pad, bg] of [
  [192, "icon-192.png", 0.08, "#241A16"],
  [512, "icon-512.png", 0.08, "#241A16"],
  [512, "maskable-512.png", 0.2, "#241A16"],
  [180, "apple-touch-icon.png", 0.1, "#241A16"],
]) {
  const inner = Math.round(size * (1 - pad * 2));
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;background:${bg};display:flex;align-items:center;justify-content:center">${svg.replace("<svg ", `<svg width="${inner}" height="${inner}" `)}</body></html>`);
  await page.screenshot({ path: new URL(`../public/icons/${name}`, import.meta.url).pathname });
}
await browser.close();
console.log("Icons written to public/icons");

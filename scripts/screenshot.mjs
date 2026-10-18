// Usage: node scripts/screenshot.mjs <url-path> <out.png> [width] [fullPage]
import { chromium } from "@playwright/test";
const [, , path = "/", out = "shot.png", width = "1280", full = "1"] = process.argv;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 } });
await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle" });
await page.screenshot({ path: out, fullPage: full === "1" });
await browser.close();

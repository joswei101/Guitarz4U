// Developer helper: lists elements wider than a phone screen. node scripts/find-overflow.mjs <url>
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 375, height: 812 } });
await p.goto(process.argv[2], { waitUntil: 'networkidle' });
console.log(await p.evaluate(() => [...document.querySelectorAll('body *')]
  .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
  .slice(0, 12).map((el) => `${el.tagName}.${el.className} right=${Math.round(el.getBoundingClientRect().right)}`).join('\n')));
await b.close();

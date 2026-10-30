// Developer helper: node scripts/screenshot.mjs <url> <out.png> [width] [height] [fullPage 1|0]
import { chromium } from 'playwright';
const [,, url, out, w = '1280', h = '900', full = '1'] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(url, { waitUntil: 'networkidle' });
await p.screenshot({ path: out, fullPage: full === '1' });
await b.close();

// Renders public/icons/logo-mark.svg into PNG icons and the social-share image.
// Run with: node scripts/build-icons.mjs   (uses the Playwright Chromium browser)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const svg = readFileSync(root + 'public/icons/logo-mark.svg', 'utf8');
const fraunces = root + 'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2';

const browser = await chromium.launch();
const page = await browser.newPage();

async function render(html, width, height, out) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><html><head><style>
    @font-face{font-family:Fraunces;src:url(file://${fraunces}) format('woff2');font-weight:100 900}
    html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden}
  </style></head><body>${html}</body></html>`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: root + out, omitBackground: true });
  console.log('wrote', out);
}

const mark = (size) => svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
for (const size of [192, 512]) {
  await render(`<div style="display:grid;place-items:center;width:${size}px;height:${size}px">${mark(size)}</div>`, size, size, `public/icons/icon-${size}.png`);
}
// Maskable/Apple icons need a solid background and safe padding.
await render(`<div style="display:grid;place-items:center;width:512px;height:512px;background:#2B1B12">${mark(360)}</div>`, 512, 512, 'public/icons/maskable-512.png');
await render(`<div style="display:grid;place-items:center;width:180px;height:180px;background:#2B1B12">${mark(140)}</div>`, 180, 180, 'src/app/apple-icon.png');

// Open Graph / social sharing image (1200×630). Uses the logo and words only — no product photos.
await render(`<div style="width:1200px;height:630px;background:radial-gradient(circle at 30% 20%,#4a2f1f,#1E1209 70%);display:flex;align-items:center;gap:56px;padding:0 90px;box-sizing:border-box;font-family:Fraunces,serif">
  ${mark(300)}
  <div>
    <div style="font-size:108px;font-weight:650;color:#F4ECDC;letter-spacing:-1px">Guitarz<span style="color:#E0A868">4U</span></div>
    <div style="font-size:36px;color:#E0A868;margin-top:8px">Second-hand guitars &amp; repairs</div>
    <div style="font-size:28px;color:#B08D57;margin-top:22px;letter-spacing:4px;text-transform:uppercase">Sandringham · Johannesburg</div>
  </div></div>`, 1200, 630, 'public/images/og-image.png');
await browser.close();

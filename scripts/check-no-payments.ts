// Guard-rail: fails if any online-payment integration sneaks into the code base.
// Run with `npm run check:no-payments` (also runs in CI).
import fs from "node:fs";
import path from "node:path";

const FORBIDDEN = [
  /payfast/i, /stripe/i, /paypal/i, /yoco/i, /peach\s*payments/i, /paystack/i, /ozow/i, /snapscan/i, /zapper/i,
  /\bcard[_\s-]?number\b/i, /\bcvv\b/i, /\bcvc\b/i, /checkout\.js/i, /payment[_-]?gateway/i,
];
// Files that legitimately mention these words (documentation of what is NOT used, and this checker).
const ALLOW = new Set(["scripts/check-no-payments.ts", "README.md", "docs/TESTING-REPORT.md", "docs/FREE-SERVICES.md", "src/lib/faq.ts"]);
const ROOTS = ["src", "scripts", "public", "db", "package.json", "next.config.ts"];

let failures = 0;
function scan(p: string) {
  const stat = fs.statSync(p);
  if (stat.isDirectory()) return fs.readdirSync(p).forEach((f) => scan(path.join(p, f)));
  if (!/\.(ts|tsx|js|mjs|json|sql|html|css)$/.test(p) || ALLOW.has(p.replace(/\\/g, "/"))) return;
  const text = fs.readFileSync(p, "utf8");
  for (const re of FORBIDDEN) {
    const m = text.match(re);
    if (m) {
      failures++;
      console.error(`✖ ${p}: found "${m[0]}"`);
    }
  }
}
ROOTS.filter((r) => fs.existsSync(r)).forEach(scan);
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
for (const d of deps) if (/pay|stripe|card|checkout/i.test(d)) { failures++; console.error(`✖ dependency looks payment-related: ${d}`); }
if (failures) {
  console.error(`\n${failures} possible payment integration(s) found. Guitarz4U must not process online payments.`);
  process.exit(1);
}
console.log("✔ No online payment gateways, card fields or payment SDKs found.");

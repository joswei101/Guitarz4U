#!/usr/bin/env node
// Fails if any online payment gateway, card checkout or payment SDK has been
// introduced into the source code or dependencies. Guitarz4U must only use
// purchase requests followed by private EFT arranged by the owner.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SCAN_DIRS = ["src", "supabase", "public", "scripts"];
const FILES = ["package.json", "next.config.ts"];
const SKIP = new Set(["node_modules", ".next", ".git", "check-no-payment-gateways.mjs"]);

// Patterns that indicate a payment integration (case-insensitive).
const PATTERNS = [
  /payfast/i, /stripe/i, /paypal/i, /yoco/i, /ozow/i, /peach\s*payments|peachpayments/i, /paystack/i, /snapscan/i, /zapper/i,
  /braintree/i, /square(up)?\.com/i, /adyen/i, /checkout\.com/i, /payment[_-]?intent/i, /card[_-]?number/i, /\bcvv\b|\bcvc\b/i,
  /payment\s*gateway\s*(sdk|api|key)/i, /merchant[_-]?(id|key)/i, /pay\.google\.com|apple-?pay/i,
];
// Wording that is allowed because it explains the absence of online payments.
const ALLOW = [/no (online )?payment/i, /does not process online payments/i, /not (be )?used/i];

const hits = [];
function scanFile(file) {
  const text = fs.readFileSync(file, "utf8");
  text.split("\n").forEach((line, i) => {
    for (const re of PATTERNS) {
      if (re.test(line) && !ALLOW.some((a) => a.test(line))) hits.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim().slice(0, 140)}`);
    }
  });
}
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|mjs|js|json|sql|toml|svg|html|css|md)$/.test(entry.name)) scanFile(full);
  }
}

for (const d of SCAN_DIRS) if (fs.existsSync(path.join(ROOT, d))) walk(path.join(ROOT, d));
for (const f of FILES) if (fs.existsSync(path.join(ROOT, f))) scanFile(path.join(ROOT, f));

// Dependencies (including transitive ones in the lockfile).
const lock = fs.existsSync(path.join(ROOT, "package-lock.json")) ? JSON.parse(fs.readFileSync(path.join(ROOT, "package-lock.json"), "utf8")) : { packages: {} };
const PAYMENT_PACKAGES = /(^|\/)(@?stripe|payfast|paypal|@paypal|yoco|ozow|paystack|braintree|square|adyen|@adyen)([/-]|$)/i;
for (const name of Object.keys(lock.packages ?? {})) if (PAYMENT_PACKAGES.test(name.replace(/^node_modules\//, ""))) hits.push(`dependency: ${name}`);

if (hits.length) {
  console.error("Possible payment integration found (not allowed for Guitarz4U):\n" + hits.join("\n"));
  process.exit(1);
}
console.log("OK: no online payment gateways, card checkout code or payment SDKs found.");

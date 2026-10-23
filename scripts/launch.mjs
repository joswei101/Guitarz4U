#!/usr/bin/env node
// One-command launch: creates the Supabase project, builds the database,
// configures logins and email, then builds and deploys the site to Netlify.
//
// Required environment variables (set them in the environment settings —
// never paste them into chat or commit them):
//   SUPABASE_ACCESS_TOKEN   Supabase personal access token (supabase.com/dashboard/account/tokens)
//   NETLIFY_AUTH_TOKEN      Netlify personal access token (app.netlify.com/user/applications)
// Optional (needed for customers to receive verification/reset emails):
//   GMAIL_ADDRESS           e.g. joshuaweinfas@gmail.com
//   GMAIL_APP_PASSWORD      Google "App password" (16 characters)
// Optional overrides:
//   SITE_NAME (default guitarz4u), SUPABASE_REGION (default eu-central-1), ADMIN_EMAIL
//
// Re-running is safe: existing project/site are reused and SQL is only applied once.
// Usage: node scripts/launch.mjs
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";

const SB = "https://api.supabase.com/v1";
const env = process.env;
const STATE_FILE = ".launch-state.json"; // git-ignored; holds the generated DB password
const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) : {};
const save = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), { mode: 0o600 });

const SITE_NAME = env.SITE_NAME || "guitarz4u";
const REGION = env.SUPABASE_REGION || "eu-central-1";
const ADMIN_EMAIL = (env.ADMIN_EMAIL || env.GMAIL_ADDRESS || "joshuaweinfas@gmail.com").toLowerCase();

function need(name) {
  if (!env[name]) {
    console.error(`Missing ${name}. Add it as an environment variable and run again.`);
    process.exit(1);
  }
  return env[name];
}
const sbToken = need("SUPABASE_ACCESS_TOKEN");
need("NETLIFY_AUTH_TOKEN");

async function sb(path, init = {}) {
  const res = await fetch(SB + path, {
    ...init,
    headers: { Authorization: `Bearer ${sbToken}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${init.method || "GET"} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}
const sql = (ref, query) => sb(`/projects/${ref}/database/query`, { method: "POST", body: JSON.stringify({ query }) });
const sh = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", env: { ...env, ...opts.env } });
const shOut = (cmd, extraEnv = {}) => execSync(cmd, { encoding: "utf8", env: { ...env, ...extraEnv } });
const step = (msg) => console.log(`\n=== ${msg}`);

// Make an existing (already registered) account the administrator, then stop.
if (process.argv.includes("--make-admin")) {
  if (!state.ref) throw new Error("Run the full launch first.");
  const rows = await sql(state.ref, `update public.profiles set role = 'admin' where lower(email) = '${ADMIN_EMAIL.replace(/'/g, "''")}' returning email`);
  console.log(rows.length ? `${ADMIN_EMAIL} is now an administrator.` : `No account for ${ADMIN_EMAIL} yet — register on the website first, then run this again.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
step("1. Supabase project");
let ref = state.ref;
if (!ref) {
  const projects = await sb("/projects");
  const existing = projects.find((p) => p.name === SITE_NAME);
  if (existing) ref = existing.id ?? existing.ref;
  else {
    const orgs = await sb("/organizations");
    if (!orgs.length) throw new Error("No Supabase organisation found. Create one (Free plan) in the dashboard first.");
    state.dbPassword ||= crypto.randomBytes(18).toString("base64url");
    save();
    const created = await sb("/projects", {
      method: "POST",
      body: JSON.stringify({ name: SITE_NAME, organization_id: orgs[0].id, db_pass: state.dbPassword, region: REGION }),
    });
    ref = created.id ?? created.ref;
    console.log(`Created project ${ref} in ${REGION} (Free plan).`);
  }
  state.ref = ref;
  save();
}
for (let i = 0; i < 90; i++) {
  const p = await sb(`/projects/${ref}`);
  if (p.status === "ACTIVE_HEALTHY") break;
  if (i === 0) console.log(`Waiting for project to start (status ${p.status})…`);
  await new Promise((r) => setTimeout(r, 10_000));
}
const supabaseUrl = `https://${ref}.supabase.co`;
console.log(`Project ready: ${supabaseUrl}`);

// ---------------------------------------------------------------------------
step("2. Database (tables, security rules, storage buckets)");
const [{ exists } = {}] = await sql(ref, "select to_regclass('public.products') is not null as exists");
if (exists) console.log("Database already set up — skipping.");
else {
  for (const file of fs.readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
    console.log(`Applying ${file}`);
    await sql(ref, fs.readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
}
try {
  await sql(ref, "create extension if not exists pg_cron");
  await sql(ref, "select cron.schedule('expire-reservations', '*/30 * * * *', $$ select public.expire_reservations(); $$)");
  console.log("Reservation expiry scheduled every 30 minutes.");
} catch (e) {
  console.warn("Could not schedule reservation expiry (enable pg_cron in the dashboard later):", e.message);
}

// ---------------------------------------------------------------------------
step("3. API keys");
const keys = await sb(`/projects/${ref}/api-keys?reveal=true`);
const pick = (...names) => keys.find((k) => names.includes(k.type) || names.includes(k.name))?.api_key;
const publishable = pick("publishable", "anon");
const secret = pick("secret", "service_role");
if (!publishable || !secret) throw new Error("Could not read API keys from Supabase.");

// ---------------------------------------------------------------------------
step("4. Netlify site");
const netlify = "npx --yes netlify-cli@latest";
let siteId = state.siteId;
if (!siteId) {
  const sites = JSON.parse(shOut(`${netlify} api listSites --data '{"filter":"all"}'`));
  const found = sites.find((s) => s.name === SITE_NAME);
  if (found) siteId = found.id;
  else {
    const created = JSON.parse(shOut(`${netlify} api createSite --data '${JSON.stringify({ body: { name: SITE_NAME } })}'`));
    siteId = created.id;
  }
  state.siteId = siteId;
  save();
}
const site = JSON.parse(shOut(`${netlify} api getSite --data '{"site_id":"${siteId}"}'`));
const siteUrl = (site.ssl_url || site.url).replace(/\/$/, "");
console.log(`Netlify site: ${siteUrl}`);

// ---------------------------------------------------------------------------
step("5. Logins and email settings");
const tpl = (f) => fs.readFileSync(`supabase/templates/${f}`, "utf8");
const auth = {
  site_url: siteUrl,
  uri_allow_list: `${siteUrl}/**`,
  external_email_enabled: true,
  mailer_autoconfirm: false,
  mailer_subjects_confirmation: "Confirm your Guitarz4U account",
  mailer_templates_confirmation_content: tpl("confirmation.html"),
  mailer_subjects_recovery: "Reset your Guitarz4U password",
  mailer_templates_recovery_content: tpl("recovery.html"),
  mailer_subjects_email_change: "Confirm your new Guitarz4U email address",
  mailer_templates_email_change_content: tpl("email_change.html"),
};
if (env.GMAIL_ADDRESS && env.GMAIL_APP_PASSWORD) {
  Object.assign(auth, {
    smtp_host: "smtp.gmail.com",
    smtp_port: "465",
    smtp_user: env.GMAIL_ADDRESS,
    smtp_pass: env.GMAIL_APP_PASSWORD,
    smtp_admin_email: env.GMAIL_ADDRESS,
    smtp_sender_name: "Guitarz4U",
    rate_limit_email_sent: 30,
  });
} else {
  console.warn("GMAIL_ADDRESS / GMAIL_APP_PASSWORD not set: customers will NOT receive verification emails until SMTP is configured.");
}
await sb(`/projects/${ref}/config/auth`, { method: "PATCH", body: JSON.stringify(auth) });
console.log("Auth configured.");

// ---------------------------------------------------------------------------
step("6. Environment variables and deploy");
const vars = {
  NEXT_PUBLIC_SITE_URL: siteUrl,
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishable,
  SUPABASE_SECRET_KEY: secret,
  NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: "false",
  ...(env.GMAIL_ADDRESS && env.GMAIL_APP_PASSWORD
    ? {
        SMTP_HOST: "smtp.gmail.com",
        SMTP_PORT: "465",
        SMTP_USER: env.GMAIL_ADDRESS,
        SMTP_PASS: env.GMAIL_APP_PASSWORD,
        SMTP_FROM: `Guitarz4U <${env.GMAIL_ADDRESS}>`,
        ADMIN_NOTIFICATION_EMAIL: env.GMAIL_ADDRESS,
      }
    : {}),
};
const link = { NETLIFY_SITE_ID: siteId };
for (const [k, v] of Object.entries(vars)) {
  execSync(`${netlify} env:set ${k} "$VAL" --force${/SECRET|PASS/.test(k) ? " --secret" : ""}`, {
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...env, ...link, VAL: v },
  });
}
// The build reads public values at build time, so pass them to the local build too.
sh(`${netlify} deploy --build --prod`, { env: { ...link, ...vars } });

// ---------------------------------------------------------------------------
step("7. Smoke test");
const home = await fetch(siteUrl);
const body = await home.text();
console.log(`Home page: HTTP ${home.status}${body.includes("Guitarz4U") ? " — looks good" : " — unexpected content"}`);
const shop = await fetch(`${siteUrl}/shop`);
console.log(`Shop page: HTTP ${shop.status}`);

console.log(`
DONE. Your site: ${siteUrl}

Last steps for you:
 1. Open ${siteUrl}/register and create your account with ${ADMIN_EMAIL}, then click the link in the email.
 2. Then run:  node scripts/launch.mjs --make-admin   (or ask Claude to) to make that account the administrator.
Database password (keep it safe, e.g. in a password manager) is stored in ${STATE_FILE}.`);

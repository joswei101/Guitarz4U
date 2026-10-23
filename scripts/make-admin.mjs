#!/usr/bin/env node
// Grants the administrator role to an EXISTING account.
//
// 1. Register on the website with the owner's email and verify it.
// 2. Run (from the project folder, with .env.local containing the SECRET key):
//      npm run make-admin -- owner@example.com
//
// There is deliberately no public way to become an administrator.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = { ...process.env };
if (fs.existsSync(".env.local")) {
  for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const email = (process.argv[2] || "").trim().toLowerCase();
const revoke = process.argv.includes("--revoke");
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !email.includes("@")) {
  console.error("Usage: npm run make-admin -- owner@example.com [--revoke]");
  process.exit(1);
}
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (in .env.local or the environment).");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: profile, error } = await supabase.from("profiles").select("id, email, role").ilike("email", email).maybeSingle();
if (error) {
  console.error("Lookup failed:", error.message);
  process.exit(1);
}
if (!profile) {
  console.error(`No account found for ${email}. Register on the website first, then run this again.`);
  process.exit(1);
}
const role = revoke ? "customer" : "admin";
const { error: updateError } = await supabase.from("profiles").update({ role }).eq("id", profile.id);
if (updateError) {
  console.error("Update failed:", updateError.message);
  process.exit(1);
}
console.log(`${profile.email} is now ${role === "admin" ? "an ADMINISTRATOR" : "a customer"}.`);

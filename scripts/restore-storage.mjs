// Uploads a folder created by backup-storage.mjs back into Supabase Storage.
// Usage: SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/restore-storage.mjs ./backup/storage
import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.argv[2] || "backup/storage";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const types = { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else yield p;
  }
}

for (const bucket of readdirSync(root)) {
  let n = 0;
  for (const file of files(join(root, bucket))) {
    const path = relative(join(root, bucket), file).split("\\").join("/");
    const ext = path.split(".").pop().toLowerCase();
    const { error } = await supabase.storage.from(bucket).upload(path, readFileSync(file), { contentType: types[ext], upsert: true });
    if (error) console.error(bucket, path, error.message);
    else n++;
  }
  console.log(`${bucket}: ${n} files restored`);
}

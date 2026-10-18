// Downloads every file from the Supabase Storage buckets into a folder.
// Usage: SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/backup-storage.mjs ./backup/storage
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const out = process.argv[2] || "backup/storage";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const BUCKETS = ["product-images", "site-assets", "submission-images", "repair-images"];

async function walk(bucket, prefix = "") {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;
  let n = 0;
  for (const item of data) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (!item.id) {
      n += await walk(bucket, path); // folder
      continue;
    }
    const { data: blob, error: e } = await supabase.storage.from(bucket).download(path);
    if (e) throw e;
    const file = join(out, bucket, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(await blob.arrayBuffer()));
    n++;
  }
  return n;
}

for (const b of BUCKETS) console.log(`${b}: ${await walk(b)} files`);

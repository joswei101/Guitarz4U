// Applies every SQL file in db/migrations that has not been applied yet.
// Safe to run repeatedly: usage `npm run db:migrate`.
import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  await client.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  await client.query("alter table schema_migrations enable row level security");
  const done = new Set((await client.query("select name from schema_migrations")).rows.map((r) => r.name));
  const dir = path.join(process.cwd(), "db", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (done.has(file)) continue;
    process.stdout.write(`Applying ${file} … `);
    await client.query("begin");
    try {
      await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log("done");
    } catch (err) {
      await client.query("rollback");
      console.log("FAILED");
      throw err;
    }
  }
  console.log("Database is up to date.");
  await client.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Combines all migrations into supabase/setup-all.sql, for people who prefer to
// paste ONE file into the Supabase SQL Editor instead of using the CLI.
// Run: node scripts/build-setup-sql.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('../supabase/migrations/', import.meta.url).pathname;
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const out = ['-- Guitarz4U: complete database setup (generated — do not edit).',
  '-- Paste into Supabase → SQL Editor → New query → Run, ONCE, on a NEW empty project.', ''];
for (const f of files) out.push(`-- ===== ${f} =====`, readFileSync(dir + f, 'utf8'), '');
// Record the migrations as applied, so the Supabase CLI / GitHub Action can
// apply FUTURE migrations on top of a database set up by pasting this file.
out.push('-- ===== migration history (for the Supabase CLI) =====',
  'create schema if not exists supabase_migrations;',
  'create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);',
  ...files.map((f) => `insert into supabase_migrations.schema_migrations (version, name) values ('${f.split('_')[0]}', '${f.replace(/^\d+_|\.sql$/g, '')}') on conflict do nothing;`), '');
writeFileSync(new URL('../supabase/setup-all.sql', import.meta.url), out.join('\n'));
console.log(`Wrote supabase/setup-all.sql from ${files.length} migrations.`);

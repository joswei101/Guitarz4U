# Backup, data export and migration

## What to back up

1. **Database** (all records) — the important part.
2. **Uploaded files** — product photos (`product-images`) and private submission photos (`submissions`).
3. **Code** — already safe in GitHub.

## Method 1 — Admin export (no tools needed) — monthly

Admin → **Export & backup** → **Download full backup** (one JSON file) and/or individual CSV spreadsheets. Store in a private, encrypted place (e.g. a password-protected folder). It contains personal information — treat it carefully (POPIA).

Limitation: this is a readable copy of the data, not a one-click restore file. Restoring from it needs technical help.

## Method 2 — Encrypted weekly backup with GitHub (recommended)

1. Supabase → **Connect** → copy the **Session pooler** connection string; replace `[YOUR-PASSWORD]` with your database password.
2. GitHub → Settings → Secrets and variables → Actions → add `SUPABASE_DB_URL` (that string) and `BACKUP_PASSPHRASE` (a long password you store safely — without it the backup can't be opened).
3. GitHub → Actions → **Database backup** → Run workflow. It then runs every Sunday. Download from the run's **Artifacts** (kept 30 days).

To decrypt: `gpg -d guitarz4u-db-DATE.tgz.gpg > backup.tgz` then `tar xzf backup.tgz`.

## Method 3 — Manual full dump with the Supabase CLI

On a computer with Node.js installed:

```bash
npx supabase db dump --db-url "$SUPABASE_DB_URL" -f roles.sql --role-only
npx supabase db dump --db-url "$SUPABASE_DB_URL" -f schema.sql
npx supabase db dump --db-url "$SUPABASE_DB_URL" -f data.sql --use-copy --data-only
```

## Backing up photos

Supabase → **Storage** → open each bucket → select files → **Download**. For many files, use the S3-compatible access (Storage → Settings → S3 connection) with a tool such as `rclone`. The `product_images` and `submission_files` tables list every file path.

## Restoring

**Into a new Supabase project** (e.g. after a disaster):

1. Create a new project. Do **not** run the setup file if restoring a full dump.
2. Restore with `psql`:

   ```bash
   psql "$NEW_DB_URL" -f roles.sql
   psql "$NEW_DB_URL" -f schema.sql
   psql "$NEW_DB_URL" -c "SET session_replication_role = replica" -f data.sql
   ```

3. Re-upload photos to the same bucket paths.
4. Update the Netlify environment variables to the new project's URL and keys; redeploy.

Note: auth users (logins) are in the `auth` schema; the dump includes them when made from the same CLI version. Test a restore once on a spare free project so you know it works.

## Moving to another host

- **Website:** standard Next.js. Options: Cloudflare Workers (with `@opennextjs/cloudflare`), Render, Railway, a VPS (`npm run build && npm start`). Copy the same environment variables. Update the Supabase Site URL/Redirect URLs and Google OAuth origins.
- **Database:** standard PostgreSQL. Any Supabase project (hosted or self-hosted) works by applying the migrations and restoring data. Moving off Supabase entirely would require replacing Supabase Auth and Storage (a development task).

## Retention

The audit log keeps copies of changed records. Periodically (e.g. yearly) consider deleting audit entries older than your legal retention period, and old non-transactional enquiries, in line with the privacy policy. Ask your accountant how long sale and repair records must be kept.

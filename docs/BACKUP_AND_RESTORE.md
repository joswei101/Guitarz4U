# Backups and restore

## What is protected, and how

| What | How | Cost |
| --- | --- | --- |
| Whole database (products, requests, customers, history, audit log) | Daily **encrypted** backup by GitHub Actions (`.github/workflows/backup.yml`), kept 30 days | Free |
| Product, seller and repair photos | Same workflow (optional, needs the secret key) | Free |
| Spreadsheets of key records | Admin → **Exports & backups** → CSV downloads | Free |
| Sold-item history | Sold products stay in the database ("sold archive") — never deleted automatically | Free |

The Supabase **Free** plan does **not** include downloadable automatic backups, so the GitHub workflow is your backup.
Backups are encrypted with a passphrase only you know, because they contain customer personal information.

## One-off setup (about 10 minutes)

1. In Supabase click **Connect** → copy the **Session pooler** connection string. Replace `[YOUR-PASSWORD]` with the
   database password from setup step 2.1.
2. Make up a long backup passphrase (e.g. five random words) and store it in your password manager.
   **Without it, backups cannot be opened.**
3. On GitHub: repository → **Settings → Secrets and variables → Actions → New repository secret**. Add:

   | Secret | Value |
   | --- | --- |
   | `SUPABASE_DB_URL` | the connection string from step 1 |
   | `BACKUP_PASSPHRASE` | your passphrase |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL (for the daily keep-alive ping) |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your publishable key |
   | `SUPABASE_SECRET_KEY` | optional — include photos in the backup |

4. **Actions → Backup & keep-alive → Run workflow** to test it. A green tick means it worked.

The workflow then runs every day at about 03:17. Each run's file is under **Actions → (run) → Artifacts**.

> Note: backups contain personal data. GitHub keeps them 30 days. Downloaded copies should be kept somewhere private.

## Download and open a backup

1. GitHub → **Actions** → latest "Backup & keep-alive" run → download the artifact (a `.zip`).
2. Unzip to get `guitarz4u-backup-YYYY-MM-DD.tar.gz.gpg`.
3. Decrypt (on a computer with GnuPG installed — Gpg4win on Windows, GPG Suite on Mac):

   ```bash
   gpg --decrypt guitarz4u-backup-2026-10-18.tar.gz.gpg > backup.tar.gz
   tar xzf backup.tar.gz
   ```

   You get `backup/roles.sql`, `backup/schema.sql`, `backup/data.sql` and (optionally) `backup/storage/…` photos.

## Restore

Restoring replaces data — do it calmly, ideally into a **new** Supabase project first to check it.

1. Create a new Supabase project (free) and note its connection string.
2. Install the PostgreSQL command-line tools (`psql`) and run:

   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file backup/roles.sql --file backup/schema.sql \
     --command 'SET session_replication_role = replica' \
     --file backup/data.sql \
     --dbname "postgresql://postgres.[ref]:[password]@...pooler.supabase.com:5432/postgres"
   ```

   This follows Supabase's official "restore from a dump" procedure.
3. Restore photos (if backed up):

   ```bash
   SUPABASE_URL=https://<new-ref>.supabase.co SUPABASE_SECRET_KEY=<new secret key> \
     node scripts/restore-storage.mjs backup/storage
   ```

4. Point Netlify's environment variables at the new project, redeploy, and update Supabase Authentication URLs and
   SMTP settings (these settings are not part of the database dump).

## Monthly habit (recommended)

- Admin → Exports & backups → download **Products**, **Sold archive**, **Purchase requests**, **Seller submissions**,
  **Repairs**. Store them in a private folder.
- Check the latest backup run has a green tick.

## Data retention and deletion

- Business records (purchases, offers, repairs) are kept for record-keeping. When a customer asks to delete their
  account, their login and personal details are removed but the anonymised business record stays
  (see [ARCHITECTURE.md](ARCHITECTURE.md#privacy-popia)).
- Old backups expire automatically after 30 days, so deleted data disappears from backups within a month.

# Backups and restores

**The free Supabase plan does not include automatic backups you can download or restore yourself.** You are responsible for keeping copies. The practical free approach: download a backup from the admin dashboard every week, and do a full database dump every month (or before any big change).

Keep backups somewhere **private** (e.g. an encrypted folder or a private cloud drive). They contain customers' personal information, which POPIA requires you to protect.

## 1. Weekly: admin exports (no technical skills needed)

**Admin → Exports & backups**:
- **Download full backup (JSON)** — every table in one file (products, private serial numbers, purchase requests, reservations, seller submissions and offers, repairs, reviews, enquiries, notes, settings, audit log…).
- **CSV exports** — open in Excel or Google Sheets. Useful ones: *Sold products archive*, *Purchase requests*, *Seller submissions*, *Repair bookings*, *Audit log*.

## 2. Monthly: full database dump (most complete)

Needs Node.js on your computer and your database password.

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db dump -f backup-schema.sql      # structure, functions, policies (for reference)
npx supabase db dump --data-only -x storage.buckets -x storage.objects -f backup-data-$(date +%F).sql
```

The data dump includes your tables **and login accounts** (`auth.users`). Storage bucket rows are excluded because the migrations recreate the buckets; the photo files themselves are backed up separately (section 3).

Alternatively, with PostgreSQL tools installed, use the connection string from **Supabase → Connect** (use the "Session pooler" string if your network has no IPv6):

```bash
pg_dump "postgresql://postgres.[ref]:[PASSWORD]@[host]:5432/postgres" --no-owner -Fc -f guitarz4u-$(date +%F).dump
```

## 3. Product photo backups

Photos are in Supabase Storage (`product-images` public bucket; customer photos in the private `customer-uploads` bucket).

- **Simple:** Supabase → **Storage** → open a bucket → select files → **Download**.
- **Complete (S3-compatible tools):** Supabase → **Storage → Settings → S3 Connection** → create access keys, then use a free tool such as `rclone`:

```bash
rclone sync supabase:product-images ./photo-backup/product-images
rclone sync supabase:customer-uploads ./photo-backup/customer-uploads
```

The *Product image list* CSV export lists every stored photo path, so you can check nothing is missing.

## 4. Restoring

### Restore into a new or empty Supabase project (tested)
1. Create the project (SETUP §2) and apply the three migrations (SETUP §3).
2. The migrations add starter rows (categories, contact settings) and audit entries; clear them so the backup's copies can be loaded:
   ```bash
   psql "CONNECTION_STRING" -c "truncate public.categories, public.site_settings, public.audit_logs cascade;"
   ```
3. Restore the data (the dump turns triggers off while loading, so no duplicate notifications or audit rows are created):
   ```bash
   psql "CONNECTION_STRING" -v ON_ERROR_STOP=1 -f backup-data-YYYY-MM-DD.sql
   ```
   This procedure was tested on a local Supabase stack: products, requests, login accounts and reference-number counters were all restored.
3. Re-upload photos to the same bucket paths (rclone `sync` in the other direction, or upload in the dashboard).
4. Update the Netlify environment variables if the project URL/keys changed, then redeploy.

### Restoring from the JSON backup
The JSON backup is primarily a readable record. To load it into a database, import each table (Supabase **Table Editor → Insert → Import data from CSV** works with the CSV exports; import parent tables first: `categories`, `brands`, `profiles`, `products`, then the rest). The SQL dump in section 2 is easier to restore — keep both.

> Login accounts (passwords) live in Supabase's `auth` schema. They are included in a full `pg_dump` of the database but not in the admin exports. If accounts are lost, customers can simply register again with the same email; their old records remain linked by email in the exports.

## 5. Deleted accounts (POPIA)

When you process a deletion request (Admin → Customers & privacy), personal details are replaced with placeholders on that customer's requests, submissions and repairs; reviews, wishlist, alerts and notifications are removed; and the login account is deleted. The **business records stay** (what was sold, when, for how much) so your tax and sales history remains intact. Remember that older backups still contain the deleted person's data: delete or overwrite old backups on a regular schedule (for example, keep only the last 6–12 months).

## 6. Test your backups

Every few months, restore a backup into a **local** Supabase (`npx supabase start`, then `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f backup-data.sql`) to confirm it works.

# Deployment & handover guide

This guide takes Guitarz4U from source code to a live site on your own `.com` domain. Nothing here has been deployed yet. Each step says what you (the owner) need to sign up for.

> Prices below are rough guides from the time of writing. Check the provider's current pricing before you sign up.

---

## 1. Recommended hosting (affordable, reliable)

Uploads (customer photos up to 10 MB and videos up to 50 MB) rule out hosts with small request limits. **Vercel's serverless functions cap request bodies at about 4.5 MB**, so video uploads would fail there.

### Option A: one small server with Docker (recommended, lowest running cost)

| Item | Suggestion | Approx. cost |
| --- | --- | --- |
| Server | A 2 vCPU / 4 GB VPS: e.g. **xneelo** or **Afrihost** (South African data centres), or **Hetzner** (EU, very cheap) | R150–R450 / month |
| Database | PostgreSQL in the same Docker Compose stack (included) | included |
| HTTPS | **Caddy** reverse proxy (free, automatic Let's Encrypt certificates) | free |
| File storage | **Cloudflare R2** private bucket (free tier ~10 GB), or the server's disk volume | free to start |
| Email | **Brevo** (free tier ~300 emails/day) or **Resend** | free to start |
| Domain | `.com` from Cloudflare Registrar, Namecheap or a local registrar | ~R200–R300 / year |

### Option B: managed platform (less server admin, a bit more per month)

**Render** or **Railway** for the app (Docker deploy) + **Neon** or **Supabase** for PostgreSQL + **Cloudflare R2** for files. Use `STORAGE_DRIVER=s3` (managed platforms have ephemeral disks).

---

## 2. Deploy with Docker Compose (Option A)

On the server (Ubuntu 24.04):

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. Get the code
git clone https://github.com/joswei101/Guitarz4U.git && cd Guitarz4U

# 3. Configure
cp .env.example .env
nano .env   # fill in values (see sections below). Also add: POSTGRES_PASSWORD=<long random>
#   APP_URL=https://www.your-domain.com
#   CRON_SECRET=$(openssl rand -hex 32)

# 4. Build & start (migrations run automatically on start)
docker compose up -d --build

# 5. Seed reference data and create the owner account
docker compose exec app npx tsx prisma/seed.ts
docker compose exec -it app npx tsx scripts/create-admin.ts --email you@your-domain.com --name "Your Name"
```

### HTTPS with Caddy

```bash
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile >/dev/null <<'CADDY'
www.your-domain.com {
    reverse_proxy 127.0.0.1:3000
    request_body {
        max_size 60MB
    }
}
your-domain.com {
    redir https://www.your-domain.com{uri} permanent
}
CADDY
sudo systemctl reload caddy
```

### Scheduled maintenance (required)

Expires abandoned checkout reservations and cleans up old sessions. Run every 5 minutes:

```bash
crontab -e
*/5 * * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://www.your-domain.com/api/cron/maintenance > /dev/null
```

(The checkout also expires stale reservations itself, so stock is never stuck, but the cron keeps order statuses tidy.)

---

## 3. Database

- Migrations live in `prisma/migrations`. Production uses `npx prisma migrate deploy` (applied automatically by the Docker image on start).
- Never run `prisma migrate dev` or `prisma migrate reset` against production.
- Managed PostgreSQL (Neon/Supabase): copy their connection string into `DATABASE_URL` and add `?sslmode=require`.

---

## 4. PayFast card payments

1. Create a merchant account at **payfast.io** and complete verification (ID, proof of bank account, business details). PayFast must approve the account before live payments work.
2. **Sandbox first:** PayFast's sandbox gives you test merchant credentials. Set:
   ```
   PAYFAST_MODE=sandbox
   PAYFAST_MERCHANT_ID=…  PAYFAST_MERCHANT_KEY=…  PAYFAST_PASSPHRASE=…
   ```
   `APP_URL` must be publicly reachable (PayFast posts payment notifications to `APP_URL/api/payments/payfast/notify`).
3. In the PayFast dashboard → *Settings → Developer settings*, set the **same passphrase**.
4. Test a full purchase in sandbox: the order should move to **Paid** only after PayFast's notification arrives (the browser redirect alone never marks it paid). Check *Admin → Orders → Payments → Gateway notifications*.
5. Go live: switch to live credentials and `PAYFAST_MODE=live`. Do one small real purchase and refund it.

How it works:

- Checkout sends a signed, **card-only** (`payment_method=cc`) request. Amounts and references always come from the database.
- Every notification (ITN) is checked for a valid signature, the right merchant ID, the exact amount, and is **confirmed directly with PayFast's validation endpoint**.
- Each notification is stored once (duplicate-proof) and applied inside a database transaction with row locks.

**Refunds:** the dashboard records refund decisions. You process the actual refund in the PayFast dashboard, then enter PayFast's refund reference to mark it **Completed**. The system will not show a refund as completed without that reference.

---

## 5. Email

Any SMTP provider works. Example (Brevo):

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your Brevo SMTP login>
SMTP_PASSWORD=<your Brevo SMTP key>
EMAIL_FROM="Guitarz4U <no-reply@your-domain.com>"
ADMIN_NOTIFICATION_EMAIL=Joshuaweinfas@gmail.com
```

**Verify your domain with the provider** (add the SPF/DKIM DNS records they give you). Otherwise emails will land in spam. Gmail addresses can't be used as the `From` address for bulk-sending services.

To check it works: register a test account and confirm the verification email arrives. *Admin → Settings* shows whether email is configured. Every email attempt is recorded with status `SENT`, `FAILED` or `SKIPPED_NOT_CONFIGURED`.

---

## 6. File storage (photos & videos)

- **Local disk** (`STORAGE_DRIVER=local`): files go to `LOCAL_STORAGE_DIR`. In Docker this is the `uploads` volume, so back it up (section 9).
- **Cloudflare R2** (`STORAGE_DRIVER=s3`): create a **private** bucket (do not enable public access) and an API token with read/write on that bucket only, then set `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION=auto`.

All files are served through the app (`/api/files/:id`), which checks permissions. Customer sell/repair uploads are only visible to that customer and staff. Product photos become public only once the product is published.

---

## 7. WhatsApp (optional)

- **Manual WhatsApp works now:** every page has WhatsApp buttons to 064 856 7019 (`wa.me/27648567019`). No setup needed.
- **Automated status messages** are optional and use only Meta's **official WhatsApp Business Cloud API**:
  1. Create a Meta Business account and a WhatsApp Business app at developers.facebook.com, and add and verify a phone number. The number used with the API can't be used in the normal WhatsApp app at the same time, so consider a second number.
  2. Create and get approval for message templates with these names and body parameters:
     - `repair_status_update`: {{1}} name, {{2}} repair reference, {{3}} status
     - `repair_quote_ready`: {{1}} name, {{2}} repair reference
     - `order_status_update`: {{1}} name, {{2}} order number, {{3}} status
  3. Set `WHATSAPP_PHONE_NUMBER_ID` and a permanent `WHATSAPP_ACCESS_TOKEN` (System User token).
- Messages are only sent to customers who ticked the WhatsApp consent box in *Account → Settings*. Delivery results are recorded honestly; nothing is simulated.

---

## 8. Connect your `.com` domain

1. Buy the domain (e.g. `guitarz4u.com` if available).
2. In the domain's DNS, add:
   - `A` record `@` → your server's IP
   - `A` record `www` → your server's IP (or `CNAME www` → your platform's hostname on Render/Railway)
3. Set `APP_URL=https://www.your-domain.com` and restart (`docker compose up -d`).
4. Caddy (or your platform) issues the HTTPS certificate automatically.
5. Add the email provider's SPF/DKIM records (section 5).
6. Submit `https://www.your-domain.com/sitemap.xml` in **Google Search Console** after verifying the domain.

---

## 9. Backups & recovery

**Database (nightly):**

```bash
# /etc/cron.d/guitarz4u-backup (on the server)
0 2 * * * root docker compose -f /root/Guitarz4U/docker-compose.yml exec -T db pg_dump -U guitarz4u -Fc guitarz4u > /root/backups/guitarz4u-$(date +\%F).dump && find /root/backups -name '*.dump' -mtime +30 -delete
```

Copy `/root/backups` off the server regularly (e.g. `rclone` to R2, Google Drive or another provider). A backup that only lives on the same server is not a backup. Managed databases (Neon/Supabase) include point-in-time recovery; check that your plan has it switched on.

**Uploaded files:** with R2, enable object versioning or a lifecycle copy. With local storage, back up the Docker volume:
`docker run --rm -v guitarz4u_uploads:/data -v /root/backups:/b alpine tar czf /b/uploads-$(date +%F).tgz -C /data .`

**Restore:**

```bash
docker compose exec -T db pg_restore -U guitarz4u -d guitarz4u --clean --if-exists < guitarz4u-YYYY-MM-DD.dump
docker run --rm -v guitarz4u_uploads:/data -v /root/backups:/b alpine sh -c "cd /data && tar xzf /b/uploads-YYYY-MM-DD.tgz"
```

Test a restore onto a spare database at least once before launch.

---

## 10. Admin accounts

- There is **no default admin and no default password**. Create the owner with `scripts/create-admin.ts` (section 2). It requires a strong password of at least 12 characters.
- Add a content manager the same way with `--role CONTENT_MANAGER`, or promote a verified customer account in *Admin → Customers*.
- The dashboard is at `/admin`. Customers who try it get a 404, and every admin action is checked on the server and written to the audit log.

---

## 11. Troubleshooting

| Symptom | Check |
| --- | --- |
| Orders stay "Awaiting payment" after paying | PayFast can't reach `APP_URL/api/payments/payfast/notify`. Is `APP_URL` correct and public? Is the passphrase identical in `.env` and the PayFast dashboard? Check server logs for `Rejected PayFast ITN` and its `reason`. |
| `bad_signature` in logs | Passphrase mismatch, or a proxy is altering the request body. |
| `server_unreachable` | The server can't make outbound HTTPS calls to `sandbox.payfast.co.za` / `www.payfast.co.za`. |
| Emails not arriving | *Admin → Settings* shows "not configured", or the `Notification` table shows `FAILED` with the error. Check domain verification (SPF/DKIM). |
| Uploads fail on large videos | Raise the reverse proxy body limit (Caddy `max_size 60MB`, Nginx `client_max_body_size 60m`). |
| "Invalid environment configuration" on start | The log lists the missing or invalid variable. |
| Items stuck as "in another customer's checkout" | Reservations expire after 20 minutes. Make sure the maintenance cron is running. |

Logs are structured JSON on stdout: `docker compose logs -f app`.

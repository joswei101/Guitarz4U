# Setup guide (beginner-friendly)

This guide takes you from nothing to a working Guitarz4U website. Allow about 1–2 hours the first time. You don't need to write any code.

You will create three free accounts: **GitHub** (stores the code), **Supabase** (database, logins, photos) and **Netlify** (hosts the website). None of them need a credit card for the free plans. **Never enter card details or start a paid trial** — if any screen asks you to, stop and check this guide.

> Screens in these services change from time to time. If a button has moved, look for the same words nearby.

---

## 1. GitHub (code)

The code already lives in the GitHub repository `joswei101/guitarz4u`. Netlify will deploy it automatically whenever the `main` branch changes. Nothing else is needed here unless you want to work on the code locally (see [Local development](#9-local-development-optional)).

---

## 2. Create the Supabase project

1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub.
2. Create an **organisation** on the **Free** plan.
3. **New project**:
   - Name: `guitarz4u`
   - Database password: click **Generate**, then **save it in a password manager**. You need it for backups and the CLI.
   - Region: choose the region **closest to South Africa** that is offered. Note which region you chose — the privacy policy must mention where data is stored (see the pre-launch checklist).
   - Plan: **Free**.
4. Wait for the project to finish setting up.

### 2a. Copy your keys

Open **Project Settings → API Keys** (sometimes shown as **Settings → API**). You need:

| Key | Where it goes | Secret? |
| --- | --- | --- |
| Project URL (`https://xxxx.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` | No |
| **Publishable** key (or legacy **anon** key) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No — safe in the browser |
| **Secret** key (or legacy **service_role** key) | `SUPABASE_SECRET_KEY` | **Yes — never share it, never put it in code** |

---

## 3. Create the database (migrations)

The database structure, security rules and workflows are in `supabase/migrations/`. Apply them **in filename order**. Choose **one** method:

### Method A — SQL Editor (no installs)

1. In Supabase open **SQL Editor → New query**.
2. Open `supabase/migrations/20261019000001_core_schema.sql` on GitHub, click **Raw**, copy everything, paste into the editor, click **Run**. You should see "Success. No rows returned".
3. Repeat for `20261019000002_functions_and_workflows.sql`.
4. Repeat for `20261019000003_security_policies.sql`.

Do **not** run `supabase/seed.sql` unless you want the demonstration listings (you can remove them later from Admin → Settings).

### Method B — Supabase CLI (if you have Node.js installed)

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF   # the "xxxx" part of your project URL
npx supabase db push                               # asks for your database password
```

### Check it worked

**Table Editor** should list tables such as `products`, `purchase_requests`, `reservations`. **Storage** should show two buckets: `product-images` (public) and `customer-uploads` (private).

---

## 4. Configure authentication

Open **Authentication** in Supabase.

### 4a. URLs
**Authentication → URL Configuration**:
- **Site URL**: your website address, e.g. `https://guitarz4u.netlify.app` (update it later if you buy a domain).
- **Redirect URLs**: add `https://guitarz4u.netlify.app/**` (and later `https://www.yourdomain.com/**`). For local development also add `http://localhost:3000/**`.

### 4b. Email confirmation
**Authentication → Sign In / Providers → Email**: keep **Email provider** enabled and **Confirm email** turned **on**.

### 4c. Email templates (important)
**Authentication → Email Templates**. Replace the body of these templates with the HTML from this repository so that links work even if a customer opens the email on a different device:

| Template | File | Subject |
| --- | --- | --- |
| Confirm signup | `supabase/templates/confirmation.html` | Confirm your Guitarz4U account |
| Reset password | `supabase/templates/recovery.html` | Reset your Guitarz4U password |
| Change email address | `supabase/templates/email_change.html` | Confirm your new Guitarz4U email address |

### 4d. Email sending (SMTP) — required before launch

Supabase's built-in email service **only sends to members of your Supabase organisation** and only about 2 emails per hour. Real customers will **not** receive verification or password-reset emails until you add your own SMTP server. Free options:

**Option 1 — Gmail (simplest for one owner)**
1. Turn on 2-Step Verification for the Gmail account.
2. Create an **App password** (Google Account → Security → App passwords).
3. In Supabase **Authentication → Emails → SMTP Settings** (or **Project Settings → Authentication → SMTP**), enable custom SMTP:
   - Host `smtp.gmail.com`, Port `465`, Username = your Gmail address, Password = the app password
   - Sender email = your Gmail address, Sender name = `Guitarz4U`
4. Personal Gmail accounts have daily sending limits (a few hundred per day) — plenty for a small shop.

**Option 2 — Brevo free plan** (about 300 emails/day at the time of writing)
1. Create a free Brevo account and verify a sender email.
2. Use Brevo's SMTP host, port 587, login and SMTP key in the same Supabase SMTP settings.

After setting up SMTP, check **Authentication → Rate Limits** and set "emails per hour" to something sensible (e.g. 30).

Use the **same SMTP details** for the website's own notification emails (step 7, optional).

### 4e. Google sign-in (optional, free)
1. In <https://console.cloud.google.com> create a project → **APIs & Services → OAuth consent screen** (External, app name "Guitarz4U", your email).
2. **Credentials → Create credentials → OAuth client ID** → Web application. Authorised redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
3. In Supabase **Authentication → Sign In / Providers → Google**: enable it and paste the Client ID and Client Secret.
4. Set the environment variable `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` on Netlify and redeploy.

The "Continue with Google" button stays **hidden** until you do step 4. (Google sign-in was not tested end-to-end because it needs your Google credentials — test it once after setup.)

---

## 5. Automatic reservation expiry (recommended)

Approved reservations expire automatically whenever you open the admin dashboard. To expire them on a schedule even when you're not logged in, enable the free `pg_cron` extension:

1. **Database → Extensions** → enable **pg_cron**.
2. **SQL Editor** → run:

```sql
select cron.schedule('expire-reservations', '*/30 * * * *', $$ select public.expire_reservations(); $$);
```

---

## 6. Environment variables

These are set in Netlify (**Site configuration → Environment variables**) and, for local development, in a file called `.env.local` (copy `.env.example`). Never commit `.env.local`.

| Variable | Required | Example / notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://guitarz4u.netlify.app` — no trailing slash |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable (or anon) key |
| `SUPABASE_SECRET_KEY` | Recommended | Secret (service_role) key. Only used to delete login accounts when you process a POPIA deletion request. Mark it **secret** in Netlify |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | No | `true` only after step 4e |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | No | For owner/customer notification emails. Same details as step 4d. `SMTP_FROM` e.g. `Guitarz4U <you@gmail.com>` |
| `ADMIN_NOTIFICATION_EMAIL` | No | Where new-request emails go, e.g. `Joshuaweinfas@gmail.com` |

If SMTP isn't configured the site still works: everything appears in the in-app notification centres, and the site never claims an email was sent.

---

## 7. Deploy

Follow [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 8. Create the first administrator (secure)

There is **no public way to become an admin**. After the site is live:

1. Visit your website → **Sign in → Create an account** using the owner's email (e.g. Joshuaweinfas@gmail.com). Verify the email.
2. In Supabase open **SQL Editor** and run (replace the email):

```sql
update public.profiles set role = 'admin' where lower(email) = lower('Joshuaweinfas@gmail.com');
select email, role from public.profiles where role = 'admin';
```

3. Sign out and back in. You'll now see an **Admin** button and can open `/admin`.

Alternative from a computer with the code: put the Supabase URL and secret key in `.env.local`, then run `npm run make-admin -- Joshuaweinfas@gmail.com`.

To remove admin rights: `update public.profiles set role = 'customer' where lower(email) = lower('someone@example.com');`

All role changes are recorded in the audit log.

---

## 9. Local development (optional)

1. Install [Node.js 22](https://nodejs.org) and [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. `git clone https://github.com/joswei101/guitarz4u.git && cd guitarz4u && npm install`
3. `npx supabase start` — starts a private copy of the database, logins and storage on your computer, with demonstration data and a test inbox at <http://127.0.0.1:54324>.
4. `cp .env.example .env.local` and fill in the values printed by `npx supabase status` (`API_URL`, `PUBLISHABLE_KEY`, `SECRET_KEY`).
5. `npm run dev` → <http://localhost:3000>. Register, open the test inbox to verify, then `npm run make-admin -- your@email`.
6. Changing the database? Create a new file in `supabase/migrations/` (never edit migrations that are already live), run `npx supabase db reset` locally, then `npm run db:types`.

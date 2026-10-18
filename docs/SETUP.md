# Setting up Guitarz4U — step by step

This guide assumes no technical background. It takes about **1–2 hours** the first time. Everything here is free;
**never enter a credit card** — none of these steps need one. If a screen asks you to upgrade or start a trial, skip it.

> Menus on these websites change from time to time. If a button has moved, look for the closest match or search the
> provider's help pages for the item name in **bold**.

You will set up three free accounts:

1. **GitHub** — stores the code (you already have this).
2. **Supabase** — database, customer logins and photo storage.
3. **Netlify** — puts the website on the internet.

---

## 1. GitHub repository

The code lives in the `joswei101/Guitarz4U` repository on the branch `claude/guitarz4u-website-build-rt0p5r`.

1. Open the repository on github.com and create a **Pull request** from that branch into `main`, then **Merge** it.
   (Or ask Claude to do it.) Netlify will deploy from `main`.
2. Recommended: keep the repository **Private** (**Settings → General → Danger zone → Change visibility**).
   No secrets are stored in the code, but a private repository keeps your business setup to yourself.

---

## 2. Supabase (database, login, storage)

### 2.1 Create the project

1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub.
2. **New project**:
   - Name: `guitarz4u`
   - Database password: click **Generate** and **save it in a password manager** (you need it for backups).
   - Region: choose the closest available (e.g. a European or South African region if listed).
   - Plan: **Free**.
3. Wait a couple of minutes for it to start.

### 2.2 Create the database tables

1. In your project, open **SQL Editor** → **New query**.
2. Open the file `supabase/migrations/20261018000001_core_schema.sql` from GitHub, click **Raw**, copy everything,
   paste it into the SQL editor and press **Run**. You should see "Success".
3. Repeat, **in this order**, for:
   - `20261018000002_security_and_triggers.sql`
   - `20261018000003_workflows.sql`
   - `20261018000004_storage_settings_seed.sql`

> Developer alternative: `npx supabase link --project-ref <ref>` then `npx supabase db push`.

This creates all tables, security rules (Row-Level Security), the four photo storage buckets, the guitar categories,
default settings, and an hourly job that expires old reservation holds.

### 2.3 Copy your keys

Open **Project Settings → API Keys** (sometimes shown under **Connect**):

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **Publishable key** (`sb_publishable_…`) — or the legacy **anon** key. Safe to use in the website.
- **Secret key** (`sb_secret_…`) — or the legacy **service_role** key. **Never share this or put it in code.**
  Only needed for email notifications and photo backups.

### 2.4 Login settings

Open **Authentication**:

1. **URL Configuration**
   - **Site URL**: your Netlify address (e.g. `https://guitarz4u.netlify.app`) — you get it in step 4; come back then.
   - **Redirect URLs**: add `https://guitarz4u.netlify.app/**` (and later your own domain, e.g. `https://guitarz4u.com/**`).
2. **Sign In / Providers → Email**: keep **Email** enabled and **Confirm email** ON.
3. **Password requirements** (under Providers → Email or Policies): minimum length **8**.

### 2.5 Login emails — IMPORTANT

Supabase's built-in email sender is only for testing: it sends very few emails per hour and may only deliver to your
own team's addresses. **Before real customers register you must set up your own (free) SMTP sender**, otherwise
customers will not receive confirmation and password-reset emails.

Easiest free option — **Gmail with an App Password**:

1. On your Google account, turn on **2-Step Verification** (myaccount.google.com → Security).
2. Then open **App passwords**, create one called "Guitarz4U" and copy the 16-character password.
3. In Supabase: **Authentication → Emails → SMTP Settings → Enable custom SMTP**:
   - Sender email: your Gmail address · Sender name: `Guitarz4U`
   - Host: `smtp.gmail.com` · Port: `465` · Username: your Gmail address · Password: the App Password
4. Gmail allows roughly 500 emails a day — plenty for a small shop. (Alternative: Brevo's free plan, ~300 emails/day.)

**Recommended:** make links work even if a customer opens the email on another device. In
**Authentication → Emails → Templates**:

- **Confirm signup** — set the link to:
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account`
- **Reset password** — set the link to:
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`

(The default templates also work, as long as the customer opens the link in the same browser.)

### 2.6 Google sign-in (optional, free)

Only do this if you want a "Continue with Google" button. Without it, the button is simply not shown.

1. Go to <https://console.cloud.google.com> → create a project "Guitarz4U".
2. **APIs & Services → OAuth consent screen**: External, app name "Guitarz4U", your email. Publish the app.
3. **Credentials → Create credentials → OAuth client ID** → Web application.
   - Authorised redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
     (Supabase shows the exact value on its Google provider page).
4. Copy the **Client ID** and **Client secret** into Supabase → **Authentication → Providers → Google** → Enable → Save.
5. In Netlify (step 4) set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` to `true` and redeploy.

Google sign-in is free.

---

## 3. Environment variables (settings the website needs)

| Name | Value | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Your website address, e.g. `https://guitarz4u.netlify.app` (no `/` at the end) | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (or anon) key | No — protected by database rules |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `true` only after step 2.6, otherwise `false` | No |
| `SUPABASE_SECRET_KEY` | Supabase secret key — **only for email notifications** | **Yes** |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | e.g. `smtp.gmail.com` / `465` / your Gmail / App Password | **Yes** (password) |
| `EMAIL_FROM` | e.g. `Guitarz4U <yourname@gmail.com>` | No |
| `ADMIN_NOTIFICATION_EMAIL` | Where new-request alerts go, e.g. `Joshuaweinfas@gmail.com` | No |

Rules:

- Anything starting with `NEXT_PUBLIC_` is visible in the browser — never put secrets in those.
- Never commit real values to GitHub. `.env.local` is ignored by Git; `.env.example` lists the names only.
- The email variables are optional. Without them the site works fully; notifications are in-app only and the
  dashboard clearly says "Email not sent", so you contact customers with the WhatsApp buttons.

---

## 4. Netlify (put the website online)

1. Go to <https://netlify.com> → sign up with GitHub → **Free** plan.
2. **Add new site → Import an existing project → GitHub** → choose `Guitarz4U`, branch `main`.
3. Build settings are read from `netlify.toml` automatically (build command `npm run build`).
4. Before deploying, open **Environment variables** and add the variables from section 3.
5. Click **Deploy**. After a few minutes you get an address like `https://random-name-123.netlify.app`.
6. **Site configuration → Change site name** → `guitarz4u` (if available) → address becomes `https://guitarz4u.netlify.app`.
7. Update `NEXT_PUBLIC_SITE_URL` to that address, and **Deploys → Trigger deploy**.
8. Go back to Supabase step 2.4 and set the Site URL and Redirect URLs.

Every time code is merged into `main`, Netlify rebuilds the site automatically. Each deploy uses some of Netlify's
free monthly credits — see [FREE_SERVICES_AND_LIMITS.md](FREE_SERVICES_AND_LIMITS.md).

---

## 5. Create your administrator account (secure, one-off)

There is deliberately **no admin sign-up page**.

1. On your live website, click **Sign in → Create a free account** and register with `Joshuaweinfas@gmail.com`
   (or the email you want to use). Confirm your email.
2. In Supabase → **SQL Editor** → New query, run:

   ```sql
   select public.promote_to_admin('Joshuaweinfas@gmail.com');
   ```

3. Sign out and back in. You now see a dashboard icon in the header, and `/admin` works.

To remove an admin: `select public.demote_admin('person@example.com');`. This only works from the SQL editor —
the website itself can never change anyone's role.

---

## 6. First things to do in the dashboard

1. **Settings** → check contact details; add your **collection address** and **bank details** (private — only shown to
   customers when you choose to include them in a message).
2. **Website content** → upload a home-page photo you own, and review the text.
3. **Inventory → Add product** → add your first guitar, upload photos, set to **Available**.
4. Optionally load the clearly labelled demo products to preview the shop — and **remove them before launch**.
5. Work through [PRE_LAUNCH_CHECKLIST.md](PRE_LAUNCH_CHECKLIST.md).

---

## 7. Daily backups (strongly recommended)

Follow [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md) to add four GitHub secrets. This also keeps the free Supabase
project from being paused for inactivity.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Customers don't receive confirmation emails | Set up custom SMTP (2.5). Check their spam folder. |
| "Invalid or expired link" after clicking an email | Site URL / Redirect URLs in Supabase (2.4) must match your website address. Use the token-hash templates (2.5). |
| Website shows an error on every page | Check the three `NEXT_PUBLIC_SUPABASE_…`/`SITE_URL` variables in Netlify, then redeploy. |
| Site suddenly offline / database paused | Supabase pauses free projects after ~7 days without activity — open the Supabase dashboard and click **Restore**. The backup workflow's daily ping prevents this. |
| `/admin` shows "page not found" | Your account isn't an admin yet — step 5. |

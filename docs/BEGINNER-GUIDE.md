# Guitarz4U: Step-by-Step Guide to Getting Your Website Online — Beginner Edition

This guide takes you from "the code is on GitHub" to "my shop is live". You do not need to know how to code. Follow the phases in order. Each step says what you should see when it worked.

**Time needed:** about 2–3 hours the first time, spread over a day (some emails take a few minutes to arrive).

**Cost:** R0 per month. Nothing in this guide asks for a credit card. If any screen asks you for card details or to "upgrade", **stop** — you do not need it. (See Phase J.)

---

## Words you will meet

| Word | What it means |
| --- | --- |
| **Repository ("repo")** | The folder on GitHub that holds the website's code. |
| **Deploy** | Copying the latest code onto the internet so people can see it. |
| **Hosting** | The company whose computers show your website to visitors (here: **Netlify**). |
| **Database** | Where all your information is stored: guitars, customers, repairs (here: **Supabase**). |
| **Migration** | A file of instructions that creates or updates the database's tables. |
| **Environment variable** | A named setting (like a password) given to the website without putting it in the code. |
| **Secret** | A setting that must never be shown to anyone or put on GitHub. |
| **OAuth** | The system behind "Continue with Google". |
| **SMTP** | The standard way websites send email. |

---

## Phase A — Accounts you need

Create these accounts (all free). Use your business email **Joshuaweinfas@gmail.com** for all of them so everything is in one place.

| # | Service | Link | What it's for | Choose |
| --- | --- | --- | --- | --- |
| 1 | **GitHub** | https://github.com/signup | Stores the website code; triggers automatic updates. | **Free** plan. |
| 2 | **Supabase** | https://supabase.com/dashboard | Database, customer logins, photo storage. | **Free** plan. Sign in with GitHub (easiest). |
| 3 | **Netlify** | https://app.netlify.com/signup | Hosting — puts the website online. | **Free** plan. Sign up **with GitHub**. |
| 4 | **Google Cloud** | https://console.cloud.google.com | Only for the "Continue with Google" button. | Free. Do not activate a paid trial. |
| 5 | **Google Account security** | https://myaccount.google.com/security | To create an email "app password" so the website can send emails from your Gmail. | — |

Notes:

- Each service sends a **verification email**. Open it and click the link before continuing.
- **Warning — Google Cloud:** you may see an offer for a "free trial with credits" that asks for a card. **Skip it.** Setting up Google sign-in does not need billing.
- **Warning — Netlify and Supabase:** never click "Upgrade", "Pro" or "Add payment method". The free plans are enough.

✅ **Success looks like:** you can sign in to GitHub, Supabase and Netlify.

---

## Phase B — The code on GitHub

The complete website code is already in your GitHub repository **`joswei101/Guitarz4U`** (it was created and pushed for you). You do not need to upload anything.

1. Go to https://github.com/joswei101/Guitarz4U and sign in.
2. You should see folders such as `src`, `supabase`, `docs` and a file called `README.md`.
3. The new code was pushed to a **branch** (a separate copy) called `ccr-27008f20-hhrtyt`. To make it the live version, merge it into the `main` branch:
   1. Click **Pull requests** → **New pull request**.
   2. Set **base:** `main` and **compare:** `ccr-27008f20-hhrtyt`.
   3. Click **Create pull request**, then **Merge pull request** → **Confirm merge**.
4. From now on, **every change merged into `main` is put online automatically** by Netlify (Phase G). That is "automatic deployment".

**Keep the repository private** (Settings → General → Danger Zone → Change visibility) if you prefer. The code contains no secrets either way.

✅ **Success looks like:** the `main` branch shows the `src` and `docs` folders.

> **Tip:** Each time Netlify publishes a change it uses some of your free monthly allowance (Phase J). Group several small changes together rather than merging many tiny ones.

---

## Phase C — The database (Supabase)

### C1. Create the project

1. Go to https://supabase.com/dashboard → **New project**.
2. **Name:** `guitarz4u`.
3. **Database password:** click **Generate a password**, then **copy it into a safe place** (e.g. your phone's password manager). You need it in step C3. This is a **secret**.
4. **Region:** choose the closest available to South Africa (for example *Europe (Frankfurt/London)* or any Africa region if offered).
5. Plan: **Free**. Click **Create new project** and wait about 2 minutes.

✅ You see the project dashboard.

### C2. Find your project details

1. Click **Project Settings** (gear icon) → **API Keys** (or **Data API**).
2. Write down (you need them in Phase D):
   - **Project URL** — looks like `https://abcdefghijklmnop.supabase.co`. The part `abcdefghijklmnop` is your **Project ID** (also called "project ref").
   - **Publishable key** — starts with `sb_publishable_…` (if you only see "Legacy API keys", use the **anon public** key). This one is **safe to be public**.
   - **Secret key** — starts with `sb_secret_…` (legacy: **service_role**). Click to reveal and copy. This is **SECRET**. Never share it, never paste it on GitHub or in a chat.

### C3. Create the tables (choose ONE way)

**Way 1 — paste one file (simplest):**

1. On GitHub, open `supabase/setup-all.sql`, click **Raw**, select all (Ctrl/Cmd + A) and copy.
2. In Supabase click **SQL Editor** → **New query**, paste, click **Run**.
3. ✅ You see "Success. No rows returned". If you see a red error, see `docs/TROUBLESHOOTING.md`.

**Way 2 — automatic from GitHub (also used for future updates):**

1. Create a Supabase access token: https://supabase.com/dashboard/account/tokens → **Generate new token** → name it `github` → copy it (**secret**).
2. In GitHub: your repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Add three secrets:
   - `SUPABASE_ACCESS_TOKEN` = the token from step 1
   - `SUPABASE_PROJECT_ID` = your project ID (from C2)
   - `SUPABASE_DB_PASSWORD` = the database password from C1
3. GitHub → **Actions** → **Deploy database migrations** → **Run workflow**.
4. ✅ The run shows a green tick.

> Even if you used Way 1, add these secrets: future improvements to the database will then be applied automatically when they are merged.

### C4. Check it worked

In Supabase → **Table Editor** you should see tables such as `products`, `repairs`, `reservations`, `site_content`. `products` is **empty** — that is correct; you add real guitars yourself later.

In **Storage** you should see two buckets: `product-images` (public) and `submissions` (private).

### What keeps the data safe?

Security rules ("row-level security") are built into the database by the setup file. They make sure customers can only see their own records, and that only you (and staff you choose) can manage the shop — even if someone tries to bypass the website. You do not need to configure them.

---

## Phase D — Environment variables (settings for the website)

You will enter these in **Netlify** (Phase G, step 4). Netlify: **Project configuration → Environment variables → Add a variable**. After changing any of them you must **redeploy** (Deploys → Trigger deploy → Deploy project).

| Name (type exactly) | What it does | Public or secret? | Where to get the value |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Your website address, used in emails and links. No `/` at the end. | Public | Your Netlify address, e.g. `https://guitarz4u.netlify.app` (Phase G). |
| `NEXT_PUBLIC_SUPABASE_URL` | Where the database is. | Public | Supabase Project URL (C2). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Lets the website talk to the database with visitor-level access. | Public | Supabase publishable (or anon) key (C2). |
| `SUPABASE_SECRET_KEY` | Lets the website's server save form submissions safely. | **SECRET** | Supabase secret (or service_role) key (C2). |
| `SMTP_HOST` | Email server. | Public | `smtp.gmail.com` (Phase F). |
| `SMTP_PORT` | Email server port. | Public | `587` |
| `SMTP_USER` | Email login. | Secret-ish | `Joshuaweinfas@gmail.com` |
| `SMTP_PASSWORD` | Email app password. | **SECRET** | Gmail App Password (Phase F). |
| `EMAIL_FROM` | Who emails appear to come from. | Public | `Guitarz4U <Joshuaweinfas@gmail.com>` |
| `IP_HASH_SALT` | Scrambles visitor IP addresses for spam protection. | **SECRET** | Any long random text. Get one at https://www.random.org/strings/ (length 20, two strings joined). |
| `CRON_SECRET` | Protects the twice-daily maintenance task. | **SECRET** | Another long random text (at least 16 characters). |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | *Optional* extra spam check. | Public | Leave empty for now. |
| `TURNSTILE_SECRET_KEY` | *Optional* extra spam check. | **SECRET** | Leave empty for now. |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | *Optional* free Cloudflare visitor statistics. | Public | Leave empty for now. |

For local development only (on a computer), the same names go in a file called `.env.local` (copy `.env.example`). You do not need this to run the live website.

> In Netlify, mark the **SECRET** ones with **"Contains secret values"** if offered.

---

## Phase E — Logins and "Continue with Google"

### E1. Email + password logins

1. Supabase → **Authentication** → **Sign In / Providers** → **Email**.
2. Make sure **Enable email provider** and **Confirm email** are ON.
3. Set **Minimum password length** to `8`. Save.

### E2. Tell Supabase your website address

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL:** your Netlify address, e.g. `https://guitarz4u.netlify.app`.
3. **Redirect URLs** → **Add URL**: `https://guitarz4u.netlify.app/**` (with your real address). Later, when you add your own domain, add `https://www.yourdomain.co.za/**` too.

> Do E2 after Phase G gives you your web address, then come back.

### E3. Make confirmation emails work from your Gmail

Supabase's built-in email sender is only for testing (it sends very few emails and may only reach your team). Use your Gmail (Phase F, step F1 first), then:

1. Supabase → **Authentication** → **Emails** → **SMTP Settings** → turn on **Enable custom SMTP**.
2. Sender email: `Joshuaweinfas@gmail.com` · Sender name: `Guitarz4U`.
3. Host: `smtp.gmail.com` · Port: `587` · Username: `Joshuaweinfas@gmail.com` · Password: your **App Password** (F1).
4. Save. Then **Authentication → Rate Limits** → set "emails sent per hour" to about `30`.

### E4. Create Google sign-in

1. Go to https://console.cloud.google.com → top bar → **Select a project** → **New project** → name `Guitarz4U` → Create.
2. Menu → **Google Auth Platform** (or "APIs & Services → OAuth consent screen") → **Get started**:
   - App name: `Guitarz4U`; support email: yours; Audience: **External**; contact email: yours → Create.
3. **Branding**: add your privacy and terms links (`https://YOUR-ADDRESS/legal/privacy` and `/legal/terms`). Under "Authorised domains", add `YOUR-PROJECT-ID.supabase.co` and your website's domain. If Google refuses a domain, note the message and see `docs/TROUBLESHOOTING.md` — Google's rules for free subdomains change from time to time, and a custom domain (Phase J) always works.
4. **Audience** → **Publish app** (so everyone, not only test users, can sign in). Basic "email/profile" access normally needs no review.
5. **Clients** → **Create client** → Application type **Web application** → name `Guitarz4U web`:
   - **Authorised JavaScript origins:** your website address, e.g. `https://guitarz4u.netlify.app`
   - **Authorised redirect URIs:** `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback` (Supabase shows this exact address on its Google provider page — copy it from there).
   - Create. Copy the **Client ID** and **Client secret** (**secret**).
6. Supabase → **Authentication** → **Sign In / Providers** → **Google** → Enable → paste Client ID and Client secret → Save.

### E5. Test logins (after Phase G)

1. On your live site click **Sign in → Create an account**. Register with a second email you own.
2. ✅ You see "Almost done! We've sent a confirmation link". Open the email, click the link — you land on **My account**.
3. Click **Sign out**, then sign in again. ✅ Works.
4. Click **Forgotten your password?** → enter the email → open the email link → choose a new password. ✅ You land on My account.
5. Sign out → **Continue with Google** → choose your Google account. ✅ You land on My account.

### E6. Make yourself the owner (admin) — securely

There is deliberately **no public "become admin" button**. You promote yourself once, inside Supabase:

1. On the live website, register with **Joshuaweinfas@gmail.com** and confirm the email (or use Continue with Google with that address).
2. Supabase → **SQL Editor** → New query → paste and **Run**:

   ```sql
   select public.bootstrap_owner('Joshuaweinfas@gmail.com');
   ```

3. ✅ The result says `Success: … is now the owner.`
4. Refresh the website. You now see **Admin** in the header.

This only works once (when no owner exists yet), only from the Supabase dashboard, and cannot be called from the website. To add staff later, use **Admin → Customers & staff**.

---

## Phase F — Photos and email

### F1. Gmail App Password (for sending emails)

1. Go to https://myaccount.google.com/security and switch on **2-Step Verification** (required).
2. Go to https://myaccount.google.com/apppasswords → name it `Guitarz4U website` → **Create**.
3. Copy the 16-letter password (**secret**). Use it for `SMTP_PASSWORD` in Netlify (Phase D) and in Supabase SMTP settings (E3).

What to know:

- Gmail allows roughly 500 emails per day from a personal account — far more than a small shop needs.
- Emails come from your Gmail address. Some may land in spam at first; ask early customers to mark them "Not spam".
- **Later, with your own domain** (e.g. `guitarz4u.co.za`), a dedicated provider such as **Brevo** (free: 300 emails/day) gives better delivery. Brevo **cannot** send properly from a `@gmail.com` address (it rewrites it), so only switch once you have a domain. Then just change the `SMTP_*` and `EMAIL_FROM` values — no code changes.
- To check email works: **Admin → Notifications → Send a test email**. The **Email log** there shows "sent", "failed" (with the reason) or "skipped".

### F2. Photo storage

Already configured by the setup file — nothing to do:

- **Product photos** go to the public `product-images` bucket. They are automatically resized in your browser (large + thumbnail) before uploading, to save space.
- **Seller and repair photos/videos** go to the private `submissions` bucket. Only you (and staff with the right permission) can view them, through links that expire after 10 minutes. Customers can view their own.
- Allowed: JPEG, PNG, WebP, HEIC photos (up to 10 MB) and MP4/MOV/WebM videos (up to 25 MB, repairs only). Anything else is rejected by the storage itself.
- Free plan space is limited (see Phase J). Delete photos of old, finished submissions occasionally.

---

## Phase G — Put the website online (Netlify)

1. Go to https://app.netlify.com → **Add new project** → **Import an existing project** → **GitHub** → authorise → choose **Guitarz4U**.
2. **Branch to deploy:** `main`. Netlify reads the build settings from the `netlify.toml` file — leave **Build command** (`npm run build`) and **Publish directory** (`.next`) as shown.
3. **Project name:** set it to `guitarz4u` (if available) so your address is `https://guitarz4u.netlify.app`. You can change it later in **Project configuration → General → Change project name**.
4. Click **Add environment variables** (or after creation: **Project configuration → Environment variables**) and add every variable from Phase D.
5. Click **Deploy**. Building takes 2–4 minutes.
6. **Find your address:** at the top of the project page, e.g. `https://guitarz4u.netlify.app`. Put this into `NEXT_PUBLIC_SITE_URL`, then **Deploys → Trigger deploy → Deploy project**.
7. **Logs:** **Deploys** → click the latest deploy → scroll the log. "Site is live" means success. Red text means a problem (see `docs/TROUBLESHOOTING.md`).
8. **Confirm the database is connected:** open `https://YOUR-ADDRESS/api/health`. ✅ You see `{"ok":true,"database":"connected",…}`.
9. Now go back and finish **Phase E2–E6**.

### G2. Twice-daily maintenance (recommended)

This keeps the free database awake (free projects pause after about a week with no visitors), expires reservations and retries failed emails.

1. GitHub → repository → **Settings → Secrets and variables → Actions** → add:
   - `SITE_URL` = your website address (e.g. `https://guitarz4u.netlify.app`)
   - `CRON_SECRET` = exactly the same value you used in Netlify
2. GitHub → **Actions** → **Maintenance** → **Run workflow**. ✅ Green tick.

### Common deployment errors

| You see | Fix |
| --- | --- |
| "Supabase is not configured" | An environment variable is missing or misspelt. Check Phase D, then redeploy. |
| Build fails at "npm ci" | Wait and retry (Deploys → Retry deploy). If it repeats, see TROUBLESHOOTING. |
| Website works but emails never arrive | Check Admin → Notifications → Email log. Usually a wrong App Password. |
| Login links open an error page | Phase E2 (URL Configuration) not done or the address is wrong. |
| `/api/health` says "unreachable" | Wrong Supabase URL/key, or the free project is paused — open Supabase and click **Restore project**. |

---

## Phase H — Final testing checklist

Tick each one on the **live** website. Use a second email account as a "customer".

**Homepage and shop**
- [ ] Homepage loads on a phone and a computer.
- [ ] With no guitars, the home page says "New stock is on its way" and the shop says "The shop is restocking".
- [ ] "Notify me" form works.

**Accounts**
- [ ] Register → confirmation email → link works.
- [ ] Sign out and sign in again.
- [ ] Password reset email works.
- [ ] Continue with Google works.

**Products (as owner)**
- [ ] Add a guitar, upload photos, approve the description, Publish → it appears in the shop.
- [ ] Search and filters find it.
- [ ] Mark it sold → it moves to the Sold archive.

**Reservations**
- [ ] As the customer, reserve a guitar → see the expiry time and receive an email.
- [ ] As the owner, see it under Admin → Reservations; extend or cancel it.

**Selling and repairs**
- [ ] Submit "Sell a guitar" with a photo → it appears in Admin → Seller enquiries, photo visible.
- [ ] Submit a repair → send a quote from Admin → approve it from the customer account → change status.

**Notifications**
- [ ] Admin → Notifications → Send a test email arrives.
- [ ] The owner receives an email for a new enquiry.
- [ ] "WhatsApp customer" buttons open WhatsApp with a message ready (you still press Send).

**Admin and permissions**
- [ ] A normal customer who types `/admin` is sent back to the homepage.

**Mobile, privacy, payments**
- [ ] Menus and forms work on a phone.
- [ ] Privacy, Terms and other policies open (and say "Draft" until you review them).
- [ ] Contact details are correct; no street address is shown anywhere.
- [ ] There is no way to pay on the website.

**Backup and deployment**
- [ ] Admin → Export & backup → "Download full backup" downloads a file.
- [ ] Make a tiny change (e.g. an FAQ) — no deploy needed. Merge a code change to `main` → Netlify shows a new deploy within minutes.

---

## Phase I — Running the business (no coding)

Everything is done in **Admin** (top-right of the website when signed in as owner).

1. **Add a guitar:** Admin → Products → **+ Add a guitar** → fill in brand, model, category, condition, price, defects → **Save draft**. It stays hidden until published.
2. **Upload photos:** on the guitar's page → **Add photos** → choose photos. The first is the main photo; use **Make main**, ← → to reorder. Add a short description to each photo for screen-reader users.
3. **Edit price or description:** change the fields → **Save changes**. Use **Write a simple draft for me** for a starting description, or **Copy prompt for a free AI chat** and paste it into a free AI chat. Always check the text, then tick **I have checked and approve this description**. Press **Publish**.
4. **Reserved or sold:** customers reserve online. To reserve for someone who messaged you: **Reserve manually**. When the sale is complete and paid: **Mark as sold** (or **Complete sale** under Reservations). Mistake? **Restore to available**.
5. **Respond to offers:** Admin → Offers → use **WhatsApp customer** / **Email customer** to negotiate → record a counter-offer or change status (Accepted/Declined). The customer is notified if "Notify the customer" is ticked.
6. **Seller enquiry:** Admin → Seller enquiries → open it → view photos → contact the seller → after **inspecting in person**, record the inspection → **Record offer** → record **accepted/declined** → set **Handover arranged** → **Completed**. Use **Create a shop listing for this guitar** to list it.
7. **Repair quote and approval:** Admin → Repairs → open → **Send a quote** (labour and parts) → the customer approves online, or you record their WhatsApp/email approval with **Record decision** (with a note as evidence). The system will not let work start before approval.
8. **Repair progress:** change the status (In progress, Awaiting parts, Completed, Ready for collection, Collected) and add **Work log** entries. Extra cost? **Send an additional-cost quote** — completion is blocked until the customer decides.
9. **Payments:** only after you've **seen the money in your bank** (not a screenshot): open the enquiry/repair/product → **Record a verified payment**. Mistakes are **voided** (never deleted).
10. **Approve a review:** Admin → Reviews → **Approve & publish** or **Reject**. Never edit a customer's words.
11. **Export data:** Admin → Export & backup → spreadsheets (CSV) or full backup (JSON). Store securely — it contains personal information.
12. **Change website text and FAQs:** Admin → Website content (pages and policies) and Admin → FAQs. Changes are live immediately.
13. **Restore a backup:** see `docs/BACKUP-AND-MIGRATION.md`. Ask for technical help if you need to restore — it replaces live data.

More detail: `docs/OWNER-MANUAL.md`.

---

## Phase J — Costs, limits, maintenance and moving

**Expected cost: R0 per month.** Every service is on a free plan with no card on file.

| Service | Free allowance (check the provider's pricing page — these change) | What happens at the limit |
| --- | --- | --- |
| Netlify | 300 "credits" a month. A production deploy uses ~15 credits; visits and server work use the rest. | No surprise bill on the free plan. The site may stop serving until the next month or until you upgrade. Avoid many tiny deploys. |
| Supabase | ~500 MB database, ~1 GB file storage, ~5 GB data transfer, 50 000 monthly active users, 2 projects. Pauses after ~7 days without activity. | Free projects are restricted, not charged. Paused projects are restored with one click (the Maintenance task prevents pausing). |
| Gmail SMTP | ~500 emails a day. | Emails fail until the next day (shown in the Email log). |
| GitHub | Free repositories; Actions minutes are free for public repos and limited (about 2 000 min/month) for private ones. | Scheduled tasks stop until next month. |
| Google sign-in | Free. | — |

**Avoiding accidental bills:** never add a card; never click Upgrade; keep photos to a reasonable number per guitar; don't merge many tiny code changes in one day.

**Optional upgrades (only with your approval):** your own domain (about R150–R250 a year for `.co.za`), Netlify or Supabase paid plans if the shop grows a lot.

**Backups:** Admin → Export & backup monthly, plus the optional weekly encrypted GitHub backup — see `docs/BACKUP-AND-MIGRATION.md`. Product photos can be downloaded from Supabase → Storage.

**Moving to another host:** the code is standard Next.js. It can run on Cloudflare, Render, a VPS, etc. The database is standard PostgreSQL and can be exported with the Supabase CLI. See `docs/BACKUP-AND-MIGRATION.md`.

**Adding your own domain later (no rebuild needed):**

1. Buy a domain (e.g. from a South African registrar).
2. Netlify → **Domain management** → **Add a domain** → follow the DNS instructions. Netlify adds free HTTPS.
3. Change `NEXT_PUBLIC_SITE_URL` to `https://www.yourdomain.co.za` → redeploy.
4. Supabase → Authentication → URL Configuration → update Site URL and add the new Redirect URL.
5. Google Cloud → your OAuth client → add the new address to **Authorised JavaScript origins**.
6. Update the GitHub secret `SITE_URL`.
7. Optional: move email to Brevo with your domain (Phase F1).

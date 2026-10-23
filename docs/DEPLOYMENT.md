# Deployment guide (Netlify, free)

Netlify builds the site from GitHub and hosts it on a free address like `https://guitarz4u.netlify.app`.

> Do the Supabase steps in [SETUP.md](SETUP.md) (sections 2–4) first.

## 1. Connect GitHub to Netlify

1. Go to <https://app.netlify.com/signup> and sign up **with GitHub**. Choose the **Free** plan. Do not add a credit card.
2. **Add new site → Import an existing project → GitHub** → authorise → choose `joswei101/guitarz4u`.
3. Settings (normally detected automatically from `netlify.toml`):
   - Branch to deploy: `main`
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Before clicking **Deploy**, open **Add environment variables** and add the variables from [SETUP.md §6](SETUP.md#6-environment-variables). For `NEXT_PUBLIC_SITE_URL` you can use a placeholder for now.
5. Click **Deploy**. The first build takes a few minutes.

## 2. Choose your site name

**Site configuration → Site details → Change site name** → e.g. `guitarz4u` (if available) → your address becomes `https://guitarz4u.netlify.app`.

Then:
1. Update `NEXT_PUBLIC_SITE_URL` in Netlify to that exact address and **redeploy** (Deploys → Trigger deploy → Deploy site).
2. In Supabase set the **Site URL** and **Redirect URLs** to the same address (SETUP §4a).

## 3. Smoke test after each deploy

1. Open the home page, the shop and a product page.
2. Register a test account with a real email you can read → verify it → sign in.
3. Add a guitar to the request cart and submit a purchase request.
4. As admin, open **Admin → Purchase requests** and check it's there. Cancel/decline the test request.

## 4. Automatic deploys and saving free credits

Every change merged into `main` deploys automatically. On Netlify's credit-based free plan, **each production deploy uses credits** (15 credits at the time of writing, out of 300 per month), and traffic and server time also use credits. To stay comfortably inside the free plan:

- Group changes together and merge to `main` a few times a month rather than many times a day.
- Preview deploys of other branches are free (at the time of writing).
- Product photos are served from Supabase, not Netlify, which saves Netlify bandwidth.
- Website text, products, prices and settings are edited in the admin dashboard and **don't need a deploy**.
- Check usage in Netlify under **Team → Usage & billing**. If free credits run out, Netlify pauses the site until the next month — it does not charge you on the free plan.

## 5. Connecting a custom `.com` domain later

1. Buy the domain from any registrar (e.g. a South African registrar or an international one). This is the only part that costs money.
2. Netlify → **Domain management → Add a domain** → enter `yourdomain.com` and follow the DNS instructions (either point your registrar's nameservers to Netlify DNS, or add the `A`/`CNAME` records Netlify shows). HTTPS certificates are issued automatically for free.
3. Set `www` or the bare domain as **primary**.
4. Update everywhere that mentions the old address:
   - Netlify env var `NEXT_PUBLIC_SITE_URL=https://www.yourdomain.com` → redeploy.
   - Supabase **Site URL** and add `https://www.yourdomain.com/**` to **Redirect URLs** (keep the Netlify one until you're sure).
   - Google OAuth (if used): add the new domain to the consent screen's authorised domains.
   - Optionally use an email address on your domain for SMTP sending.
5. Re-test registration, password reset and a purchase request.

## 6. Other free hosts (if you ever need to move)

The app is a standard Next.js project with no Netlify-specific code, so it can also run on:
- **Vercel Hobby** — very easy for Next.js, but its free plan is for **non-commercial** use, so it doesn't suit a business.
- **Cloudflare Workers** (via the OpenNext adapter) — generous free requests and commercial use allowed, but needs extra configuration and has script-size limits.
- **Any Node.js server** (`npm run build && npm start`).

See [MAINTENANCE.md](MAINTENANCE.md#moving-to-another-host).

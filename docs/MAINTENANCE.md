# Maintenance guide

## Everyday (no code needed)

All day-to-day work happens in the **owner dashboard** at `/admin`. The in-dashboard **Owner's guide** has short
step-by-step reminders. Summary:

- **New request?** It appears in Overview → "Needs action" and in Notifications. Open it, use the WhatsApp button to
  talk to the customer, then update the status and message so they can follow progress in their account.
- **Add stock:** Inventory → Add product → photos → set **Available**.
- **Sold something:** set the product to **Sold** (or "Mark these items as sold" on the purchase request). It moves to
  the sold archive and can no longer be requested.
- **Reservations:** approve or decline. Holds expire automatically.
- **Edit text, photos, policies, announcement bar:** Website content.
- **Contact details, private address, bank details, demo data:** Settings.

## Weekly / monthly

- Weekly: clear Notifications, Messages and Reviews.
- Monthly: download CSV exports; check the latest backup run is green (GitHub → Actions).
- Monthly: glance at Supabase → Usage (storage and bandwidth) and Netlify → Usage (credits).
- Yearly: re-read the free-plan limits; review the privacy policy.

## Updating the code

- Changes go through GitHub: edit on a branch → pull request → the **CI** check must be green → merge to `main` →
  Netlify deploys automatically.
- Dependency updates: `npm outdated`, update, then `npm run lint && npm run typecheck && npm run build` and the tests.
  Security fixes for Next.js should be applied promptly.
- **Database changes**: add a new numbered file in `supabase/migrations/` (never edit one that has already been applied
  to the live database), run it in the Supabase SQL editor (or `npx supabase db push`), then regenerate types with
  `npm run db:types` against a local stack.

## Connecting a custom domain later (e.g. guitarz4u.com)

1. Buy the domain from any registrar (~R150–R300/year — the only optional cost).
2. Netlify → **Domain management → Add a domain** → follow the DNS instructions (either point the registrar's
   nameservers at Netlify, or add the records Netlify shows). HTTPS is issued automatically and free.
3. Update `NEXT_PUBLIC_SITE_URL` in Netlify to `https://guitarz4u.com` and redeploy.
4. Supabase → Authentication → URL Configuration: set **Site URL** to the new domain and add
   `https://guitarz4u.com/**` to Redirect URLs (keep the Netlify one too during the switch).
5. If Google sign-in is enabled, nothing changes (Google redirects to Supabase), but update the consent screen's
   homepage link.
6. Optional: with your own domain you can send email from `info@guitarz4u.com` via a free SMTP provider such as Brevo
   or Resend (after verifying the domain) — better deliverability than Gmail.

## Moving to another host

The app is a standard Next.js application and the data is standard PostgreSQL, so nothing locks you in.

**Website hosting** — any Next.js-capable host works with the same environment variables:

- Render, Railway, Fly.io, a small VPS (`npm run build && npm run start` behind a reverse proxy), or Vercel (paid plan
  for commercial use).
- Copy the environment variables, connect the GitHub repository, set the build command `npm run build` and start
  command `npm run start`. Update `NEXT_PUBLIC_SITE_URL` and the Supabase redirect URLs.

**Database / login / storage** — options:

- Upgrade Supabase in place (simplest, paid), or move to another Supabase project/organisation using the backup
  and restore guide.
- Self-host Supabase (open source, Docker) on your own server and restore the backup into it.
- Moving off Supabase entirely is possible but larger work: the schema is plain Postgres, but logins, storage and the
  `auth.uid()` based security rules would need replacing.

## Removing demo data

Admin → Settings → **Remove all demo data**. Demo products are flagged `is_demo` in the database, so real records are
never touched. (No demo customers or reviews are ever created.)

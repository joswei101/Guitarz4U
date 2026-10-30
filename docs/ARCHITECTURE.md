# Architecture

## Stack and why it was chosen

| Layer | Choice | Why |
| --- | --- | --- |
| Website | **Next.js 16** (App Router, React 19, TypeScript) | Server-rendered pages (fast, SEO-friendly), server actions for forms, one codebase for the public site, customer area and admin. Portable: runs on Netlify, Cloudflare, Render or any Node server. |
| Hosting | **Netlify** (free plan) | Free plan permits commercial use (Vercel's free Hobby plan does **not**), automatic deploys from GitHub, built-in Next.js support, free HTTPS and custom domains. |
| Database, auth, files | **Supabase** (free plan) | Real PostgreSQL with row-level security, email/password + Google sign-in, file storage with type/size limits, `pg_cron` for scheduled jobs. Standard Postgres = easy to export and migrate. Avoids building a custom backend. |
| Email | **Any SMTP** (Gmail App Password at launch; Brevo once a domain exists) | No vendor lock-in; swapped by changing environment variables. |
| WhatsApp | **wa.me click-to-chat links** | Automatic WhatsApp Business API messages that the business starts are charged per conversation, so they are not R0. Links open WhatsApp with the text filled in; the owner presses Send. |
| Analytics | **Built-in cookie-free counters** (+ optional Cloudflare Web Analytics) | Daily page/product view totals in the database; no personal data; only after consent. |
| Spam | Honeypot + timing check + database rate limiting (+ optional Cloudflare Turnstile) | All free. |
| Fonts | Self-hosted (Fraunces, Work Sans) | No requests to Google Fonts from visitors' browsers (privacy). |

## How a request flows

```
Browser ──> Netlify (Next.js server) ──> Supabase (Postgres + Auth + Storage)
   │                 │
   │                 ├─ Server Components read data as the visitor (RLS applies)
   │                 └─ Server Actions validate input (zod), check spam/rate limits,
   │                    then write. Public forms use the server-only secret key
   │                    and the verified user id; admin actions run as the staff
   │                    member so RLS + audit log record who did it.
   └─ Photo uploads go straight to Supabase Storage (signed upload URLs for
      private submissions; RLS-checked uploads for product photos).
```

## Security model

- **The browser only has the public key.** Every table has row-level security (RLS). Verified by `tests/db/security.test.mjs`, which attacks the API directly as anonymous visitors, two customers, limited staff and the owner.
- **Public form tables have no insert policy**: submissions only arrive through the website server after validation, honeypot/timing checks and rate limiting.
- **Roles**: `customer`, `staff` (with a permission list), `owner` (everything). `has_perm()` is used by every policy. Customers cannot change `role`, `permissions` or `is_blocked` (column privileges). Only the owner can call `owner_set_access()`. The first owner is created with `bootstrap_owner()`, which cannot be called through the API at all.
- **Business rules live in the database** so they cannot be bypassed:
  - one active reservation per guitar (unique index + row lock) — tested with 8 concurrent attempts;
  - product status only changes through `staff_set_product_status()` / reservation functions;
  - repair work cannot start without an approved initial quote, and cannot complete while any quote awaits a decision (trigger);
  - payments must be flagged as verified, are insert-only and can only be voided (not deleted);
  - a description must be approved before publishing.
- **Audit log**: triggers record who changed what and when on all important tables; append-only from the API.
- **Uploads**: bucket-level MIME allow-lists and size limits; private bucket served via 10-minute signed URLs.
- **Headers**: CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy; private routes `Cache-Control: private, no-store`.
- **Errors**: business-rule messages are shown; database internals are logged server-side only.
- **Open redirects** prevented on all `next=` parameters; flash messages refuse URLs/phone numbers/emails.
- **IP addresses** are only stored as salted hashes for rate limiting and deleted after ~2 days.

## Data model (main tables)

`profiles`, `settings`, `products` (+ `product_private`, `product_images`), `reservations`, `enquiries` (+ `enquiry_items`), `offers`, `messages`, `stock_alerts`, `wishlist_items`, `seller_enquiries` (+ `seller_offers`), `repairs` (+ `repair_quotes`, `repair_work_log`), `submission_files`, `payments`, `reviews`, `site_content`, `faqs`, `status_history`, `notifications`, `email_outbox`, `audit_log`, `page_views`, `product_views`, `rate_limits`.

Migrations: `supabase/migrations/` (also bundled as `supabase/setup-all.sql`).

## Reservation expiry

1. `pg_cron` runs `expire_reservations()` every 10 minutes (available on Supabase Free).
2. Every shop, product, cart, account and admin page also calls it before reading data (once per request).
3. The GitHub "Maintenance" workflow calls it twice a day.

Expiry never overrides an owner's decision (a sold guitar stays sold). If the free project is paused, nothing runs until it is restored — the first page load then expires overdue reservations immediately.

## Feature status

| Feature | Status |
| --- | --- |
| All public pages, shop, filters, search, sorting, product pages, sold archive, 404 | ✅ Implemented and tested |
| Enquiry cart (no payment), offers, questions, notify-me, wishlist, recently viewed | ✅ Implemented and tested |
| Reservations: 48 h, atomic, expiry, cancel/extend/convert, history | ✅ Implemented and tested |
| Sell/give-away form with photo upload, owner inspection & negotiation workflow | ✅ Implemented and tested |
| Repairs: request, quotes (labour/parts), approval gates, extra-cost approval, work log, statuses, payments | ✅ Implemented and tested |
| Accounts: register, confirm email, login, logout, reset, profile, export, deletion | ✅ Implemented and tested |
| Google sign-in | ✅ Implemented; ⚙️ needs Google OAuth credentials (Phase E4); end-to-end Google login not testable here |
| Admin dashboard: all modules, staff permissions, audit log, exports | ✅ Implemented and tested |
| Email notifications with outbox log | ✅ Implemented and tested (local mail server); ⚙️ needs SMTP settings |
| WhatsApp | ✅ Prefilled links only (by design — automatic sending is not free) |
| Analytics | ✅ Built-in counters; ⚙️ optional Cloudflare token |
| SEO: titles, descriptions, canonical, sitemap, robots, Product/LocalBusiness/FAQ structured data | ✅ Implemented and tested |
| PWA: manifest, icons, service worker (public assets only), offline page | ✅ Implemented; install prompt not tested on a real phone |
| Legal drafts | ✅ Provided, marked DRAFT; ⚠️ need owner/professional review |
| Repair warranty | ⚙️ Owner must set the period in Admin → Settings |
| Live deployment | ⚙️ Requires the owner's Netlify/Supabase accounts (cannot be created from this environment) |

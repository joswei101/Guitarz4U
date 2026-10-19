# Guitarz4U

**Second-hand equipment, first-hand service.**

The website for Guitarz4U, a second-hand guitar business in Sandringham, Johannesburg. Customers browse guitars, send **purchase requests** (not payments), request reservations, offer their own guitars for sale, book repairs, and track everything in their account. The owner manages it all from a private admin dashboard.

> **No online payments — by design.** The site has no payment gateway, card fields or checkout. Payment is arranged privately by EFT, only after the owner approves a request, and only the owner can record that an EFT was received (after checking their own bank account). `npm run check:no-payments` checks this automatically.

## What's included

| Area | Features |
| --- | --- |
| Shop | Search, brand/category/price/condition filters, special offers, newest listings, related & recently viewed items, wishlist, availability alerts, share, WhatsApp enquiry, product questions |
| Buying | Request cart → purchase request (live stock re-check) → owner review → private EFT → manual payment confirmation → collection. 10 tracked statuses |
| Reservations | Request → owner approval → time-limited hold → automatic expiry; one approved hold per guitar |
| Selling to Guitarz4U | Submission form with private photo upload, owner offers, seller accept/decline, WhatsApp option, no loose parts |
| Repairs | Booking form with photos, owner quotes, customer accept/decline, 9 tracked statuses; work can't start before approval |
| Accounts | Email/password with verification, password reset, optional Google sign-in, profile, histories, notifications, POPIA data download & deletion requests |
| Reviews | Registered customers only, owner moderation, spam checks, reporting, genuine "verified buyer" badge |
| Admin | Overview & analytics, inventory with photos, requests & EFT tracking, reservations, submissions & offers, repairs, customers & privacy requests, reviews, enquiries, notifications, editable website text, settings, CSV/JSON exports, audit log |
| Platform | Row-level security on every table, rate limiting, security headers, SEO (sitemap, structured data, Open Graph), installable PWA, accessible and responsive |

## Technology (all free tiers)

- **Next.js 16** (React) — the website and server logic
- **Supabase** — Postgres database, authentication and photo storage
- **Netlify** — hosting, automatic deploys from GitHub
- Optional free **SMTP** (Gmail app password or Brevo) — email notifications

Read [docs/FREE-SERVICES-AND-LIMITS.md](docs/FREE-SERVICES-AND-LIMITS.md) for the honest limits of each free tier.

## Documentation

| Guide | What it covers |
| --- | --- |
| [docs/SETUP.md](docs/SETUP.md) | Step-by-step setup for beginners: Supabase, database, auth, storage, email, Google, first admin, environment variables |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | GitHub + Netlify deployment, custom `.com` domain later |
| [docs/FREE-SERVICES-AND-LIMITS.md](docs/FREE-SERVICES-AND-LIMITS.md) | Every service used, free-tier limits, what needs manual setup |
| [docs/BACKUP-AND-RESTORE.md](docs/BACKUP-AND-RESTORE.md) | Exports, database backups and restores, photo backups |
| [docs/MAINTENANCE.md](docs/MAINTENANCE.md) | Day-to-day running, updates, moving to another host |
| [docs/TESTING-REPORT.md](docs/TESTING-REPORT.md) | What was tested, how, and what wasn't |
| [docs/PRE-LAUNCH-CHECKLIST.md](docs/PRE-LAUNCH-CHECKLIST.md) | Everything to do before going live, plus known limitations |

## Quick start (local development)

Requires Node.js 20.9+ and Docker (for the local Supabase stack).

```bash
npm install
npx supabase start          # local database, auth, storage and a test inbox at http://127.0.0.1:54324
cp .env.example .env.local  # then paste the keys printed by `npx supabase status`
npm run dev                 # http://localhost:3000
```

Local data includes clearly labelled **demonstration listings** (from `supabase/seed.sql`). Production starts empty.

Useful commands:

```bash
npm run lint && npm run typecheck   # code checks
npm run test:db                     # database security & workflow tests (local Supabase)
npm run build && npm run test:e2e   # browser end-to-end tests (local Supabase)
npm run check:no-payments           # confirms no payment gateway code or packages exist
npm run make-admin -- you@example.com   # grant admin to an existing account
```

## Project structure

```
src/app/(site)/      public pages, shop, cart, sell, repairs, auth, customer account
src/app/admin/       admin dashboard (server-side admin check on every page and action)
src/components/      UI components
src/lib/             Supabase clients, validation, formatting, email, data access
src/content/pages.ts default page text (owner can override in Admin → Website content)
supabase/migrations/ database schema, security policies and workflow functions
supabase/seed.sql    demonstration data (local only)
tests/               integration (database) and end-to-end (browser) tests
docs/                setup, deployment and maintenance guides
legacy/              the original single-file mockup, kept for reference
```

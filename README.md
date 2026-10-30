# Guitarz4U

The website and business system for **Guitarz4U** — a second-hand guitar shop and guitar repair service in Sandringham, Johannesburg.

**Start here if you are the owner:** [docs/BEGINNER-GUIDE.md](docs/BEGINNER-GUIDE.md) — "Step-by-Step Guide to Getting Your Website Online — Beginner Edition".

## What it does (plain English)

- **Shop:** honest listings of second-hand guitars (electric, bass, acoustic, classical, electro-acoustic) with photos, condition, defects and prices in rand. Search, filters, sorting, featured guitars, new arrivals, related and recently viewed guitars, wishlist and a sold-guitar archive. The shop starts **empty** — no fake stock.
- **No online payments, ever.** Customers send enquiries, make offers or reserve a guitar for 48 hours. Payment is arranged privately (usually EFT) and the owner records it only after checking the bank. Collection only — no delivery.
- **Sell or give away a guitar:** working, broken or incomplete guitars, with photos. The owner inspects in person, records offers and negotiations, and the seller can follow progress.
- **Repairs:** request a repair with photos/videos; the owner sends quotes (labour and parts separately); work cannot start until the customer approves, and extra costs need approval too. Customers follow progress online.
- **Customer accounts:** email/password or Google sign-in, profile, wishlist, reservations, enquiries, submissions, repairs, notifications, stock alerts, data download and account deletion.
- **Admin dashboard:** products and photos, reservations, enquiries, offers, messages, seller enquiries, repairs, payments, customers and staff permissions, reviews, website text and FAQs, notifications and email log, reports, settings, audit log and data export.
- **Policies:** editable drafts (privacy/POPIA, terms, collection and reservations, seller terms, repair terms, returns, cookies, account data) — clearly marked as drafts until reviewed.

## Technology

Next.js 16 (TypeScript) on **Netlify** · **Supabase** (PostgreSQL, Auth, Storage) · SMTP email · R0/month on free plans. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Costs and limits: [docs/COSTS-AND-LIMITS.md](docs/COSTS-AND-LIMITS.md).

## Documentation

| Document | For |
| --- | --- |
| [BEGINNER-GUIDE.md](docs/BEGINNER-GUIDE.md) | Setup, deployment, testing, running the business, costs (Phases A–J) |
| [OWNER-MANUAL.md](docs/OWNER-MANUAL.md) | Day-to-day use of the admin dashboard |
| [PRE-LAUNCH-CHECKLIST.md](docs/PRE-LAUNCH-CHECKLIST.md) | Everything to finish before going live |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common problems and fixes |
| [BACKUP-AND-MIGRATION.md](docs/BACKUP-AND-MIGRATION.md) | Backups, restore, moving hosts |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it works, security model, feature status |
| [COSTS-AND-LIMITS.md](docs/COSTS-AND-LIMITS.md) | Free-tier report and future costs |
| [TEST-REPORT.md](docs/TEST-REPORT.md) | What was tested, results, what wasn't |

## Project structure

```
src/app/            Pages and server actions (public site, /account, /admin, /auth, /api)
src/components/     Shared UI (forms, cards, admin widgets)
src/lib/            Supabase clients, auth, validation, notifications, helpers
supabase/migrations Database schema, security policies, workflow functions, seed content
supabase/setup-all.sql  All migrations in one file (paste into the Supabase SQL Editor)
content/            Source text for policies, pages and FAQs (seeded into the database)
public/             Logo, icons, service worker, offline page
tests/              Unit, database-security and end-to-end browser tests
docs/               Guides and reports
.github/workflows/  CI, database migrations, maintenance, optional backups
```

`guitarz4u-3.html` is the earlier single-page prototype, kept for reference. Its colour palette and fonts were carried into this design. Its hero photo was not reused because it could not be confirmed as an authorised photo of stock.

## For developers

```bash
npm install
cp .env.example .env.local          # fill in values (local Supabase keys are printed by `supabase start`)
npx supabase start                  # local Postgres/Auth/Storage/Mailpit (Docker)
npm run dev                         # http://localhost:3000
npm run typecheck
npm run test:all                    # unit + fresh DB + Playwright + DB security tests
```

Make yourself owner locally: `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "select public.bootstrap_owner('you@example.com');"`

Editing policies/FAQ source: change files in `content/`, then `npm run content:build` and `npm run setup-sql:build` (seeds only insert missing rows — live edits made in the admin are never overwritten).

Test data is created only by the test suite in the **local** database; the test helpers refuse to run against anything that isn't localhost.

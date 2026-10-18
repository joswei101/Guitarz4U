# Guitarz4U

**Second-hand equipment, first-hand service.**
The website for Guitarz4U — buying, selling and repairing second-hand guitars in Sandringham, Johannesburg.

A complete, working web application: shop and inventory, request cart (no online payments), reservations that need
approval, seller submissions with offers, repair bookings with quotes, customer accounts, moderated reviews,
notifications and a private owner dashboard.

> **No online payments, by design.** Customers send requests; the owner confirms personally and arranges payment
> (normally EFT). The site never collects card details or pretends a payment happened.

## Technology (all free tiers, R0 per month)

| Part | Service | Why |
| --- | --- | --- |
| Website | [Next.js 16](https://nextjs.org) (React, TypeScript, Tailwind CSS) | Fast, SEO-friendly pages; open source |
| Database, login, photo storage | [Supabase](https://supabase.com) free plan | Postgres with Row-Level Security, real authentication, file storage — one free service |
| Hosting | [Netlify](https://netlify.com) free plan | Builds automatically from GitHub; commercial use allowed on the free plan |
| Code & automation | GitHub + GitHub Actions | Source code, CI checks, daily encrypted backups |
| Email (optional) | Any SMTP, e.g. Gmail with an App Password | Free; only switched on when you configure it |

Why this stack, the security model and data design are explained in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
**Read [docs/FREE_SERVICES_AND_LIMITS.md](docs/FREE_SERVICES_AND_LIMITS.md) before launch** — free tiers have limits.

## Documentation

| Guide | What it covers |
| --- | --- |
| [docs/SETUP.md](docs/SETUP.md) | **Start here.** Step-by-step: GitHub, Supabase, database, login, email, Google sign-in, first admin, Netlify deployment, environment variables |
| [docs/FREE_SERVICES_AND_LIMITS.md](docs/FREE_SERVICES_AND_LIMITS.md) | Every free service used, its limits, and what could ever cost money |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack choice, folder structure, database, security, privacy (POPIA), data deletion |
| [docs/BACKUP_AND_RESTORE.md](docs/BACKUP_AND_RESTORE.md) | Daily encrypted backups, CSV exports, restoring |
| [docs/MAINTENANCE.md](docs/MAINTENANCE.md) | Everyday running, updates, custom domain, moving to another host |
| [docs/PRE_LAUNCH_CHECKLIST.md](docs/PRE_LAUNCH_CHECKLIST.md) | Everything to tick off before going live |
| [docs/TESTING_REPORT.md](docs/TESTING_REPORT.md) | What was actually tested, and known limitations |

## Quick start (developers)

```bash
npm install
npx supabase start            # local database + auth + storage (needs Docker)
cp .env.example .env.local    # then paste the local keys printed by `supabase start`
npm run dev                   # http://localhost:3000
```

Tests (local stack only — they refuse to run against a real project):

```bash
npm run test:db               # database security & workflow tests
npm run build && npm run test:e2e   # browser tests (Playwright)
```

`legacy/guitarz4u-mockup-v3.html` is the earlier single-page mockup, kept for reference only.

# Guitarz4U

**Second-hand equipment. First-hand service.**

Full-stack website for Guitarz4U (Sandringham, Johannesburg): an online shop for inspected second-hand guitars and equipment, a "sell your guitar" purchase-enquiry system, guitar & amplifier repair bookings with quotes and tracking, customer accounts, and a private admin dashboard.

> **Status:** feature-complete and tested locally. **Not yet deployed.** Payments, email, storage and the domain still need the owner's accounts and credentials — see [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md).

## Stack

| Concern | Choice |
| --- | --- |
| App | Next.js 15 (App Router, server actions) + React 19 + TypeScript |
| Database | PostgreSQL 16 via Prisma 6 (migrations in `prisma/migrations`) |
| Auth | Own session auth: Argon2id password hashing (`@node-rs/argon2`), random session tokens stored hashed, httpOnly cookies, email verification, password reset |
| Payments | PayFast (South African card gateway, ZAR), card-only, server-verified ITN webhooks |
| Email | Any SMTP provider via Nodemailer (Brevo, Resend, SES, Google Workspace…) |
| Files | Local disk (dev) or any private S3-compatible bucket (Cloudflare R2 recommended) |
| Styling | Tailwind CSS, custom black / white / electric-orange design system |
| Tests | Vitest integration tests on a real PostgreSQL DB + Playwright E2E (desktop & mobile) |
| Optional | WhatsApp Business Cloud API (opt-in status messages), Anthropic Claude for AI price *estimates* |

## Quick start (local development)

Requirements: Node.js 20.9+ (22 recommended), PostgreSQL 14+.

```bash
npm install
cp .env.example .env            # then edit DATABASE_URL, APP_URL=http://localhost:3000, CRON_SECRET
npx prisma migrate deploy       # create tables
npm run db:seed                 # categories, policy drafts, FAQs (no users/products)
SEED_DEMO=1 npm run db:seed     # optional: clearly-labelled [SAMPLE] products for local testing only
npm run admin:create -- --email you@example.com --name "Your Name"   # prompts for a strong password
npm run dev                     # http://localhost:3000  (dashboard: /admin)
```

Without SMTP configured, emails are not sent; in development their content (including verification and reset links) is printed to the server log, and every email is recorded in the `Notification` table with an honest status.

For PayFast sandbox testing, use PayFast's published sandbox merchant credentials in `.env` and a public URL for `APP_URL` (e.g. a tunnel) so PayFast can reach the notify endpoint.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Develop / production build / run |
| `npm run typecheck`, `npm run lint` | TypeScript and ESLint |
| `npm test` | Integration tests (needs a database whose name contains `test`; see docs/TESTING.md) |
| `npm run test:e2e` | Playwright end-to-end tests (after `npm run build`) |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Seed reference data (safe to re-run; never overwrites owner edits) |
| `npm run admin:create` | Create/promote the owner or a content manager (no default passwords) |

## Project structure

```
prisma/            schema.prisma, migrations/, seed.ts, content/*.md (policy & page drafts)
src/app/           routes: public pages, shop, checkout, account/, admin/, api/
src/app/actions/   server actions (all validate input and check permissions server-side)
src/lib/           business logic: auth/, shop/ (cart, inventory, orders, payments), repairs/,
                   enquiries/, storage/, email/, payfast.ts, permissions.ts, rate-limit.ts …
src/components/    UI: ui/ (design system), layout/, shop/, forms/, admin/
tests/             integration/ (Vitest), e2e/ (Playwright), helpers/
docs/              deployment, testing, security, launch checklist
```

## Documentation

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): hosting, database, PayFast, email, storage, WhatsApp, domain, cron, backups, admin setup, troubleshooting
- [docs/TESTING.md](docs/TESTING.md): how to run the tests, plus the recorded results
- [docs/SECURITY.md](docs/SECURITY.md): security & privacy design (POPIA notes)
- [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md): outstanding credentials, costs, approvals and legal decisions
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): key workflows (stock reservation, payments, repairs, enquiries) and the role/permission matrix

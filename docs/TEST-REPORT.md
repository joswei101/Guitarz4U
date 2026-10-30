# Test report

**Date:** 30 October 2026 · **Result: 90 automated tests executed, 90 passed, 0 failed.** Type-check and production build passed; `npm audit` (production dependencies): 0 vulnerabilities.

## How the tests were run

All tests ran against a **real local Supabase stack** (PostgreSQL 17, Supabase Auth, Storage, REST API and Mailpit email catcher, via Docker) and a **production build** of the website (`next build && next start`), in headless Chromium. Nothing was mocked: emails were really sent (to the local Mailpit inbox) and confirmation/reset links were really clicked; uploads really went to storage.

```bash
npx supabase start        # local backend
npm run build
npm run test:all          # unit → fresh database → browser tests → database security tests
```

The suite also runs in GitHub Actions (`.github/workflows/ci.yml`, "full-tests" job) on pull requests or on demand.

## Results by area (required test list)

| # | Required area | Result | Covered by |
| --- | --- | --- | --- |
| 1 | Mobile, tablet, desktop layouts | ✅ Passed | No horizontal scrolling on 14 pages at 375, 820 and 1366 px; mobile menu by keyboard; screenshots reviewed manually. |
| 2 | Registration, login, logout, password recovery, Google | ✅ Passed (Google partly) | Real email confirmation link, sign-out, wrong password, reset by email. **Google:** verified the button starts the real Supabase/Google OAuth flow with the correct callback; a complete Google login was **not tested** (needs real Google credentials). |
| 3 | Admin auth, protected routes, staff permissions | ✅ Passed | Anonymous → login; customer → no admin; repairs-only staff blocked from products/settings/exports; blocked staff lose database access. |
| 4 | Product create/edit/publish/archive/sold | ✅ Passed | Including "cannot publish without approved description", photo upload, unpublish/archive/restore, drafts hidden (404). |
| 5 | Search, filters, sorting | ✅ Passed | Text search, category, brand, condition, max price, price ascending/descending. |
| 6 | Wishlist and product enquiries | ✅ Passed | Wishlist add/view, enquiry cart, enquiry email to owner and customer. |
| 7 | Reservations: 48 h, expiry, conflicts | ✅ Passed | 8 simultaneous attempts → exactly 1 succeeds; 48 h duration; other customer blocked; cancel; automatic expiry; expiry doesn't undo a sale; per-customer limit; first page load after expiry shows correct status. |
| 8 | Seller forms, uploads, owner-only private info | ✅ Passed | Guest upload to private bucket, owner sees photo via signed link, other customer gets 404, anonymous/customer cannot download private files, HTML upload rejected. |
| 9 | Offer recording and seller status tracking | ✅ Passed | Offers never auto-accepted; owner accepts → customer emailed; seller inspection/offer/accept/handover with timeline. |
| 10 | Repairs, quotes, approval, extra-cost approval | ✅ Passed | Work blocked before approval; other customer cannot approve; customer approves online; additional quote blocks completion; owner-recorded approval requires method + evidence note. |
| 11 | Repair tracking and notifications | ✅ Passed | Customer timeline, visible work log, quote and "ready for collection" emails. |
| 12 | Manual payments; no online payment | ✅ Passed | Payment requires "verified" confirmation; customers/unauthorised staff cannot record; void keeps history; no payment wording, card fields or checkout buttons on 8 pages. |
| 13 | Review moderation | ✅ Passed | Only registered customers; hidden until approved; reviewer email/user id never public. |
| 14 | Email, WhatsApp links, notifications | ✅ Passed (email locally) | Emails delivered to local mail server; wa.me links verified. **Real Gmail delivery not tested** (needs the owner's App Password). |
| 15 | Server-side validation, permissions, spam | ✅ Passed | Validation messages; honeypot; too-fast submission; rate limiting observed; direct API inserts refused for all form tables. |
| 16 | Export, deletion, backup/restore | ✅ Passed (restore partly) | Admin CSV + full JSON backup; customer export contains only their data; deletion blocked with an active repair, succeeds otherwise. Setup SQL bundle verified on a blank database. **Restoring a production dump was not tested** (no production project). |
| 17 | Accessibility and SEO | ✅ Passed | axe-core WCAG 2.1 AA: 0 serious/critical issues on 10 pages; skip link + visible focus; unique titles/descriptions, canonical URLs, sitemap, robots, structured data. |
| 18 | Broken links, loading and error pages | ✅ Passed | Custom 404 with real 404 status; error page; empty states. A full crawl for broken links was not run. |
| 19 | Empty shop | ✅ Passed | Home, shop, sold archive and reviews on an empty database. |
| 20 | Production build and deployment | ✅ Build passed / ❌ Deployment not tested | Live deployment needs the owner's Netlify and Supabase accounts, which cannot be created from this environment. |

## Bugs found by the tests and fixed

1. Mobile: shop filter panel and Sell/Repairs/Reviews sidebars overflowed the screen at 375 px.
2. Accessibility: logo and cart links had screen-reader names that didn't match the visible text; one link colour failed contrast (4.33:1) — now ≥ 5.2:1.
3. After sending an enquiry the success message disappeared (cart emptied) — now a dedicated confirmation.
4. After a reservation lapsed, the first visitor could still see "reserved" (Next.js re-used a data request made before the expiry check) — fixed and tested.
5. Home page ignored "signed out" / "account deleted" messages — fixed; messages containing links/phone numbers are now refused (anti-phishing).
6. Text inputs without an explicit type were unstyled.
7. Local auth config was not enforcing email confirmation until the auth service restarted (test environment issue — production is configured in the dashboard, Phase E1).

## Not tested — and how to test them yourself

| Item | Why | How to test |
| --- | --- | --- |
| Live deployment on Netlify + hosted Supabase | Needs your accounts | Beginner guide Phase G and Phase H checklist. |
| Complete Google sign-in | Needs Google OAuth credentials | Phase E5 step 5. |
| Real email delivery from Gmail (and spam placement) | Needs your App Password | Admin → Notifications → Send a test email. |
| PWA install on a real phone | No physical device | Open the live site in Chrome (Android) → menu → Install app; Safari (iPhone) → Share → Add to Home Screen. |
| Real-device browsers (Safari/iOS, Samsung Internet) | Only Chromium available here | Use your own phone during Phase H. |
| HEIC photo upload from an iPhone | No iPhone | Submit a Sell request with an iPhone photo. |
| Screen-reader walkthrough | Automated checks only | Try VoiceOver (iPhone) or TalkBack (Android) on the main pages. |
| pg_cron on hosted Supabase | Tested locally only | Supabase → Integrations/Cron → check job `guitarz4u-expire-reservations` exists. |
| Encrypted GitHub backup workflow and restore | Needs your database URL | Phase J / BACKUP-AND-MIGRATION.md; test a restore into a spare free project. |
| Performance on a slow connection | Not measured | Chrome DevTools → Lighthouse on the live site. |

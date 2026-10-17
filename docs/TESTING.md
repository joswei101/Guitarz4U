# Testing

## How to run

### Integration tests (Vitest + real PostgreSQL)

Tests run against a **separate database whose name must contain `test`**. Its tables are truncated between tests, so never point it at real data.

```bash
createdb guitarz4u_test                      # once
export TEST_DATABASE_URL="postgresql://USER:PASS@localhost:5432/guitarz4u_test?schema=public"
npm test
```

The suite applies migrations (`prisma migrate deploy`), mocks only the Next.js request context, outgoing email (captured) and file storage (in memory), and uses **PayFast's public sandbox merchant credentials** with a stubbed validation endpoint. No live credentials are used and no real network calls are made.

### End-to-end tests (Playwright, desktop + mobile)

```bash
SEED_DEMO=1 npm run db:seed      # dev database with [SAMPLE] products
npm run build
npm run test:e2e                 # starts `next start` on port 3100
```

## Results (recorded 17–18 Oct 2026, local run)

**Integration: 8 files, 71 tests, all passed.**

| File | What it proves |
| --- | --- |
| `auth.test.ts` (12) | Registration with Argon2id hashing; verification email with a hashed single-use token; no account enumeration; guest repairs linked after verification; server-side validation; login success/failure; suspended accounts blocked; session cookie and hashed storage; login rate-limiting; expired sessions rejected; password reset single-use, revokes sessions, expires |
| `permissions.test.ts` (6) | Permission matrix; anonymous users and customers refused; a customer calling admin actions directly is rejected; a content manager can't change prices even by posting price fields; financial exports blocked for non-owners |
| `checkout.test.ts` (11) | Prices taken from the DB (sale price applied); terms, verification and empty-cart checks; **4 simultaneous buyers → exactly one reservation**; parts stock limits; reservation expiry releases stock; gateway cancel releases stock; new checkout abandons the old one; draft/sold/reserved/unavailable refused; checkout action redirects to payment; discount maths, expiry, per-customer limits |
| `payments.test.ts` (13) | PHP-compatible encoding; signed card-only requests; ITN signature verification and tampering detection; paid → sold → confirmation email; duplicate ITNs ignored; **3 concurrent duplicate ITNs processed once**; forged signature and PayFast "INVALID" rejected; amount mismatch flagged, not paid; failed payment releases stock; **late payment after the item was sold elsewhere → refund pending, not double-sold**; delayed payment still completes if the item is free; unknown references; PDF receipts only for verified paid orders and only for the owner |
| `enquiries.test.ts` (6) | Private uploads with EXIF stripped; customer and owner emails; consent, photo, type and contact validation; cross-site POST blocked; field errors returned; full negotiation (info request, offer, counter, revised offer, acceptance, purchase, conversion to a **DRAFT** product that is not public); accepting a counter-offer; declining closes the enquiry |
| `repairs.test.ts` (8) | Request awaits review with no payment taken; Saturday preference rejected; decline needs a reason; **no work without an accepted quote, even with an override**; online quote acceptance needs an explicit checkbox; parts wait; completion → payment due + warranty; overpayment refused; part payments; paid → ready → collected; another customer can't accept the quote; offline acceptance needs a note; online repair payment via ITN (idempotent, separate from shop orders) |
| `catalog-reviews.test.ts` (11) | Only public statuses shown; search, category, left-handed, condition, sale-aware price filters and sorting; hostile query parameters sanitised; guest cart ignores client prices; reviews need a verified purchase, stay pending, can't be duplicated or self-approved, and are approved by the owner; questions moderated, with content-manager answers needing owner approval; cancellation request → refund decision → completion requires a gateway reference (also DB-enforced) → refunded; staff can't mark orders paid; collection workflow; account deletion anonymises the profile and keeps order records; deletion blocked while orders are open |
| `uploads.test.ts` (4) | Content-based type detection (disguised PHP/SVG rejected); size and count limits; private files hidden from guests and other customers but available to the owner and staff with safe headers; CSV formula-injection protection |

**End-to-end: 64 tests (desktop Chrome + Pixel 7 mobile): 63 passed, 1 skipped.** The skip is the keyboard-focus test, which only runs on desktop.

- 20 public pages × 2 viewports: HTTP 200, exactly one `<h1>`, **no horizontal scrolling on mobile**, all images have `alt`, all visible form controls are labelled, no console errors
- Security headers (CSP, frame denial, nosniff, no `X-Powered-By`); robots.txt, sitemap and real 404 status for unknown pages and products
- Homepage CTAs, WhatsApp (`wa.me/27648567019`) and email buttons, "Closed on Saturdays"
- Main navigation (desktop menu and mobile hamburger menu), skip-to-content link
- Shop: browse, category filter, search, product page, add to cart as a guest, checkout requires sign-in
- Register → verification prompt → customer gets a **404** at `/admin` → sign out → wrong password error **keeps the typed email** → sign in
- Contact form submission; repair booking with a real photo upload → reference → public tracking page
- Login submitted **with JavaScript disabled** never puts credentials in the URL

## Defects found by testing and fixed

1. React 19 cleared form fields after a failed submission (for example, a failed login wiped the email). Forms now keep the user's input.
2. That fix briefly caused pre-JavaScript submissions to fall back to a GET request with the password in the URL. Fixed (progressive-enhancement POST) and covered by a no-JS test.
3. Hidden admin pages and unknown products returned the 404 page with HTTP status 200 because of a root loading boundary. They now return a real 404.
4. The production start-up check required an unused `SESSION_SECRET`. It was removed.
5. Handled duplicate payment notifications produced noisy database error logs. Switched to `INSERT … ON CONFLICT DO NOTHING`.
6. Admin filter inputs stretched to full width, and the floating WhatsApp button overlapped admin controls. Both fixed.

## Not covered by automated tests (manual checks before launch)

- A real **PayFast sandbox** round trip from a public URL (requires the owner's sandbox account and a publicly reachable `APP_URL`), then one small live transaction and refund.
- Real email delivery and spam placement with the chosen SMTP provider.
- Cloudflare R2 storage (the S3 driver is implemented but was not exercised against a real bucket).
- WhatsApp Cloud API (requires Meta approval and templates).
- AI price estimates (requires an Anthropic API key; the code handles "not configured", errors and refusals).
- Cross-browser checks on Safari/iOS and Firefox (E2E ran on Chromium only).

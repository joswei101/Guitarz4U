# Testing report

Date: 19 October 2026. Everything below was run against a **local** Supabase stack (real Postgres, Supabase Auth, Supabase Storage and a Mailpit test inbox, started with `npx supabase start` in Docker) and a **production build** of the website (`next build` + `next start`). Nothing was tested against a live hosted deployment, because the Supabase and Netlify accounts still need to be created by the owner.

## Summary

| Check | Command | Result |
| --- | --- | --- |
| Type checking | `npm run typecheck` | Pass, 0 errors |
| Lint (incl. React rules) | `npm run lint` | Pass, 0 problems |
| Production build | `npm run build` | Pass |
| Database security & workflow tests | `npm run test:db` | **11 / 11 passed** |
| Browser end-to-end tests (Chromium, desktop + mobile viewport) | `npm run test:e2e` | **17 / 17 passed** |
| No payment gateways | `npm run check:no-payments` | Pass (scanner also confirmed to catch a planted `payfast` string) |
| Database backup & restore | `supabase db dump` → restore into a freshly migrated database | Pass — products, requests, accounts and reference counters restored |
| Notification emails via SMTP | During E2E runs | 56 owner notification emails delivered to the local test inbox |

## Database tests (`tests/integration/workflows.test.mjs`)
1. Visitors only see published/reserved products; nobody but admins can read serial numbers.
2. Customers cannot change their own role, insert purchase requests directly, edit products, call admin functions or read the audit log.
3. Full purchase flow: drafts can't be requested; a request doesn't reserve stock; duplicate requests are rejected; other customers can't see it; admin is notified; **payment can't be confirmed before approval**; approval reserves the guitar; private notes are invisible to customers; completion before payment confirmation is blocked; payment confirmation records who confirmed and when; completion marks the guitar sold and removes it from the shop; customer sees the full history and notifications; customers can mark notifications read but not edit them; audit log records the payment confirmation; a customer with a completed purchase gets a genuine "verified buyer" review.
4. Cancelling an approved request releases the guitar.
5. Reservations need approval; a second approval for the same guitar fails; only the reservation holder can request to buy a reserved guitar; expiry releases the guitar.
6. Seller submissions reject other users' photo paths and loose parts; strangers can't see submissions or respond to offers; offer acceptance updates the status.
7. Repairs: work can't start before approval; customer quote acceptance doesn't confirm the booking by itself.
8. Reviews: pending reviews aren't public; customers can't approve their own or set "verified buyer"; reviewer name is shortened (e.g. "Thandi M."); link spam is rejected; reports work.
9. Storage: customers upload only to their own folder; can't upload product images or non-image files; can't read other customers' photos; anonymous visitors can't read private uploads.
10. Rate limiting stops a burst of purchase requests.
11. Guest enquiries work; POPIA anonymisation removes personal details but keeps business records.

## Browser tests (`tests/e2e/`)
- All 15 public pages load (HTTP 200) with a heading and **no payment wording, card fields or payment scripts**; the custom 404 page returns HTTP 404.
- Registration → blocked login before verification → verification email link (from the test inbox) → verified account.
- Search, empty-results state, category page, product page (price, defects, payment notice, second-hand notice, WhatsApp link to 27648567019).
- Wishlist, request cart, required "no payment taken" acknowledgement, purchase request submission with the exact required success message, cart emptied, stock unchanged.
- Admin: approve → awaiting EFT → payment confirmation **requires the "I checked my bank account" box** → ready for collection → completed → guitar sold.
- Customer sees updates and notifications, never the private note; sold guitar returns 404.
- Customers get 404 for `/admin` and 403 for admin exports; signed-out visitors are redirected to login.
- Password reset via emailed link, then sign-in with the new password.
- Reservation request and approval; reserved guitar can't be added to the cart.
- Seller submission with real photo upload (resized in-browser), admin views photo, offer, seller acceptance.
- Repair booking with photo, quote, customer acceptance, admin approval.
- Review submission, moderation, public display, no false "verified buyer".
- Guest contact form reaches the admin.
- Admin creates a product, uploads a photo (displayed publicly, image actually loads), publishes it; serial number never appears publicly; website text edited and reset.
- CSV and JSON exports download for admins.
- Customer data download contains their own data and no admin notes.
- Mobile (Pixel 7 viewport): no horizontal scrolling on key pages, mobile menu opens/closes and navigates, WhatsApp button visible.

## Bugs found by testing and fixed
- Optional "type of guitar" on the repair form rejected an empty selection (validation fix).
- Money amounts in database-generated messages used US formatting ("R1,200.00"); now "R1 200".
- Desktop navigation wrapped at 1280 px; required-field asterisks were read aloud by screen readers (now hidden from assistive tech).
- `upgrade-insecure-requests` broke non-HTTPS local previews; now only applied on HTTPS sites.
- Offer/quote acceptance confirmation disappeared on refresh; a persistent confirmation is now shown.

## Not tested (be aware)
- **Live deployment** on Netlify and a hosted Supabase project (accounts not yet created).
- **Real email delivery** through Gmail/Brevo (only the local SMTP test inbox).
- **Google sign-in** (needs your Google OAuth credentials).
- **Real iPhone/Safari and Android devices** — only Chromium with mobile viewport emulation. Please test on your own phone, especially photo uploads (iPhone HEIC photos are normally converted to JPEG by Safari when uploading; if a format is unsupported the site shows a clear message).
- **Screen-reader testing** with NVDA/VoiceOver — the site uses semantic HTML, labels, focus styles and ARIA attributes, but hasn't been tested with assistive technology.
- Lighthouse/performance audits and load testing.
- Scheduled reservation expiry with `pg_cron` (the expiry function itself is tested).

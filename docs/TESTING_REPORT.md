# Testing report

Tested on **18 October 2026** in the development environment, against a **local Supabase stack** (the same Postgres,
Auth, Storage and email-testing services Supabase runs in the cloud, via Docker) and a **production build** of the
website (`next build` + `next start`). Emails were caught by Mailpit, Supabase's local email inbox.

**Not deployed:** I had no access to your Supabase or Netlify accounts, so there is no live website yet and nothing was
tested on the real hosted services. Follow [SETUP.md](SETUP.md) to deploy, then use the final section of
[PRE_LAUNCH_CHECKLIST.md](PRE_LAUNCH_CHECKLIST.md) to re-test on the live site.

## Automated checks — all passing

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | 0 problems |
| Type-check | `npm run typecheck` | 0 errors |
| Production build | `npm run build` | Success |
| Database security & workflow tests | `npm run test:db` | **16 / 16 passed** |
| Browser end-to-end tests | `npm run test:e2e` | **27 / 27 passed** (16 functional + 11 accessibility; the product-page accessibility check needs demo data loaded, otherwise it is skipped) |

### Database tests (`tests/db/security.test.mjs`) — real API calls as anonymous, customer and admin users

1. Public sees published products only; drafts and serial numbers hidden from public **and** customers.
2. Customers cannot create/edit products, change their own role, call admin functions or edit settings; private
   settings (address, bank details) hidden from the public.
3. Purchase request saved with reference, availability checked, visible only to its owner and admin, admin notified,
   customers cannot change status, admin update notifies customer and adds a timeline entry.
4. Requests for draft/unavailable items rejected; anonymous submission rejected.
5. Reservations: duplicate request blocked; customers cannot approve; approval marks item reserved; **second approval
   for the same item blocked**; new requests/purchase requests on a reserved item refused; expiry releases the item;
   cancellation releases the item.
6. Availability alerts notify customers when an item becomes available again.
7. Marking sold declines pending reservation requests, sets the sold date, removes it from active listings and shows it
   in the sold archive.
8. Seller submission: status/message cannot be set by the customer; privacy consent required; other customers can't
   see it; customers can't create offers; offer → status "offer made"; only the seller can respond; acceptance notifies admin.
9. Repairs: customers can't set status/quote; past dates rejected; quote → accept → stays "awaiting review"
   (work not started automatically); other customers can't see it.
10. Reviews: always start pending; "verified purchase" cannot be self-declared and is only set for accounts with a
    completed purchase; approved reviews public without user ids; reports admin-only.
11. Rate limiting: 6th repair booking in a day refused.
12. Contact form: works without an account, requires a way to reply, messages not public.
13. Storage: customers upload only into their own folder; other customers can't read their photos; admin can;
    non-image files rejected; customers can't upload shop photos; admin can.
14. Audit log records admin changes with the admin's email; customers can't read it; it can't be deleted via the API.
15. Account deletion: customer can't call it; admin processing deletes the login and anonymises the purchase record
    (name/phone removed, record kept).
16. Demo data loads (4 labelled items) and is fully removed; customers can't remove it.

### Browser tests (`tests/e2e/`) — Chromium, desktop 1280px and mobile 390px

- All 16 public pages return 200, have a title, exactly one `<h1>`, the "Closed on Saturdays." notice and **no browser
  console errors**.
- Custom 404 page returns a real HTTP 404 (also for unknown products).
- robots.txt, sitemap.xml, web manifest and Open Graph image served correctly.
- No card/payment fields anywhere; address-privacy wording present.
- Shop search, category/condition/price filters, empty state, product page with `Product` structured data in ZAR,
  recently viewed.
- Mobile: no sideways scrolling on 7 key pages; mobile menu opens, navigates and closes.
- **Registration with email verification** (weak password and missing consent rejected → confirmation email received
  → link confirms → signed in) and sign-out.
- **Password reset by email** end to end.
- Admin area returns 404 for customers (pages and CSV exports) and redirects signed-out visitors to login.
- Admin adds a brand, creates a product, **uploads 2 photos**, reorders them, publishes and features it; the public page
  shows photos and defects but **not** the private serial number.
- Customer wishlist, request cart (prices re-checked), purchase request with the required "not a completed purchase,
  no payment taken" message, cart cleared; **admin alert email delivered** to the SMTP server and recorded as "sent";
  admin updates status/message; customer sees the notification and message.
- Reservation request → admin approval → product page shows "Currently reserved" and hides purchase buttons.
- Seller submission with photo (validation for loose parts/consent) → photo visible to admin → offer → seller accepts.
- Repair booking with photo → admin quote → customer accepts → status stays "awaiting review".
- Review submission → hidden until approved → visible on /reviews.
- Customer data export (JSON) and admin CSV export.
- **Accessibility**: axe-core scan (WCAG 2 A/AA) on 11 key pages — no serious or critical issues.

### Bugs found and fixed during testing

- Forms were cleared after a failed submission (React 19 default) — now input is kept on validation errors.
- Rand amounts formatted differently on server and phone ("R 6 200" vs "R 6,200") — now always "R 6 200".
- Reservation approval confirmation disappeared — now stays visible.
- Desktop navigation wrapped onto two lines at 1280px; logo text colour overridden — fixed.
- Product cards one-per-row on phones — now two columns.
- Email outbox sent oldest notifications first, so a backlog could delay new alerts — now newest first.

### Manual / other checks

- Backup procedure: `supabase db dump` of schema + data, encryption and decryption with GnuPG, and photo download
  script — tested locally and working.

## Not tested (needs your accounts or real devices)

- Deployment to Netlify and the hosted Supabase project (no access).
- Real Gmail SMTP delivery (tested with the local SMTP server only).
- Google sign-in (requires your Google Cloud credentials; button hidden until configured).
- GitHub Actions workflows running on GitHub (CI runs on the next push; the backup workflow needs your secrets).
- Full restore of a backup into a new Supabase project (procedure documented, follows Supabase's official steps).
- Real iPhone/Android devices and Safari/Firefox (Chromium with mobile emulation only).
- The PWA "install" prompt and offline page on a real phone.

## Known limitations and unfinished work

- **Submitting requires a free account** (purchase requests, reservations, seller and repair forms) so customers can
  track status and to reduce spam. Visitors who don't want an account are offered WhatsApp on every form.
  The contact form works without an account.
- Email notifications need SMTP + the secret key; otherwise notifications are in-app only (clearly shown).
- WhatsApp updates are **manual** (pre-filled chat link) — no automatic WhatsApp sending, as the WhatsApp Business API is not free.
- Analytics counts are approximate (no cookies, Do-Not-Track respected, no bot filtering).
- Abuse protection is per account and per contact-form sender; there is no IP-based rate limiting or CAPTCHA.
- Admin notifications have one shared "read" state (fine for a single owner).
- Search is a simple text match (fine for hundreds of items; not fuzzy/typo-tolerant).
- Policies are **drafts** and need professional review.
- No hero photograph is bundled: your earlier mockup's guitar photo was not used because its copyright owner is
  unknown. Upload your own in Admin → Website content.
- Quantity > 1 is supported, but stock is not reduced automatically when a request is accepted — mark items sold or
  edit the quantity yourself (you approve every sale personally).

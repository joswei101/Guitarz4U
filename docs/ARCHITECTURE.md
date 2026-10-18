# Architecture, security and privacy

## Why this stack

- **Next.js (React + TypeScript)** renders pages on the server, which is good for search engines (Johannesburg guitar
  searches), fast on slow mobile connections, and keeps secrets off the browser. Open source, very widely used, easy to
  host almost anywhere.
- **Supabase** provides a real PostgreSQL database, authentication (email/password, email verification, password
  reset, Google) and file storage in one free service. Its **Row-Level Security** lets the database itself decide who
  may read or change each row — so even if a page had a bug, a customer still could not read another customer's data.
- **Netlify** hosts Next.js on a free plan that allows commercial use and deploys automatically from GitHub.
- **Portability:** the data lives in standard Postgres; the app is a standard Next.js app. Both can move to other
  providers (see [MAINTENANCE.md](MAINTENANCE.md#moving-to-another-host)).

## Folder structure

```
src/app/                 Pages (one folder per URL)
  page.tsx               Home
  shop/                  Shop list, product pages, reservation form
  sell/, repairs/        Seller submission and repair booking
  cart/                  Request cart (enquiry, no payment)
  account/               Customer dashboard (requires login)
  admin/                 Owner dashboard (admins only)
  actions/               Server actions (all form submissions)
  auth/                  Email-link and Google sign-in callbacks
  sitemap.ts, robots.ts, manifest.ts, opengraph-image.tsx   SEO & PWA
src/components/          Reusable UI
src/lib/                 Supabase clients, auth guards, validation, email, formatting
src/content/             Default website copy and DRAFT policies
supabase/migrations/     Database schema, security rules, workflows, storage, seed data
tests/db/                Database security & workflow tests
tests/e2e/               Browser tests (Playwright)
.github/workflows/       CI checks; daily encrypted backup & keep-alive
docs/                    These guides
```

## Data model (main tables)

| Table | Purpose |
| --- | --- |
| `profiles` | One per login: name, phone, preferred contact, **role** (`customer`/`admin`) |
| `categories`, `brands` | Shop catalogue structure |
| `products` | Listings with status `draft`/`published`/`reserved`/`sold`/`archived`, condition, defects, history, featured, demo flag |
| `product_private` | **Admin-only**: serial number, acquisition cost, source, internal notes |
| `product_images` | Ordered photos with alt text |
| `wishlists`, `availability_alerts` | Customer favourites and "notify me" requests |
| `purchase_requests` + `purchase_request_items` | Request-cart enquiries with price/title snapshots |
| `reservations` | Reservation requests; a unique index allows only **one approved reservation per item** |
| `seller_submissions` + `seller_submission_images` + `seller_offers` | Guitars offered to Guitarz4U and your offers |
| `repair_bookings` + `repair_images` | Repair requests, quotes, confirmed appointments |
| `status_events` | Timeline shown to customers and admin |
| `reviews`, `review_reports` | Moderated reviews; `public_reviews` view exposes approved reviews without user ids |
| `notifications` | In-app notifications; `email_status` honestly records whether an email was really sent |
| `contact_messages`, `data_requests`, `admin_notes` | Contact form, POPIA requests, private notes |
| `site_settings` | Editable content; private keys (collection address, bank details) readable by admins only |
| `audit_logs` | Every admin change (who, what, before → after); cannot be edited from the website |
| `analytics_events` | Cookie-free counts (no personal data) |

Reference numbers: `G4U-PR-1001` (purchase request), `G4U-RS-…` (reservation), `G4U-SL-…` (seller), `G4U-RP-…` (repair).

## Security model

- **Authentication** by Supabase Auth: passwords are hashed by Supabase (never stored in plain text), email
  verification required, password reset by email, minimum 8 characters with a letter and a number.
- **Authorisation in three layers**:
  1. The admin layout and every admin action check the role on the server (non-admins get a 404).
  2. **Row-Level Security on every table** — customers can read only their own records; the public sees only published
     products, approved reviews and public settings.
  3. Sensitive steps run as **database functions** that check permissions and business rules themselves
     (e.g. `submit_purchase_request` locks and re-checks availability; `approve_reservation` is admin-only).
- **Server-controlled fields**: when a customer creates a submission/booking/review, triggers force the status,
  quote, "verified purchase" etc. — a customer cannot fake them.
- **Roles can only be changed from the Supabase SQL editor**, never through the website.
- **No secrets in the browser**: only the publishable key is public. The secret key is server-only and used solely for
  the email outbox. `.env*` files are git-ignored.
- **Input validation** with Zod on the server plus database `check` constraints (lengths, formats, enums).
- **Abuse protection**: per-account daily limits on requests/bookings/reviews; per-sender and global limits on the
  contact form; honeypot fields; links blocked in reviews.
- **Uploads**: images only (JPEG/PNG/WebP), max 5 MB, enforced by storage bucket settings; photos are re-encoded in
  the browser (removing GPS/EXIF metadata); customers can write only to their own folder; private buckets for
  seller/repair photos, served via short-lived signed URLs.
- **Web hardening**: Content-Security-Policy, `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, safe
  redirects (no open redirects), Markdown rendered without raw HTML, CSV exports protected against formula injection.
- **Audit log** of admin actions.

## Privacy (POPIA)

- Minimal data: name, contact details and what the customer chooses to send. No ID numbers, no card or bank details.
- Consent checkboxes on registration and on forms that include photos/personal details.
- The physical address is **never** published — stored as a private setting and shared only when you choose to.
- Customers can **download their data** instantly (Account → Privacy & data) and **request deletion**.
- **Deletion handling** (Admin → Customers & privacy): deletes the login, profile, wishlist, alerts, notifications and
  private photos; removes names/contact details from purchase, reservation, seller and repair records, which are kept
  anonymised for accounting/legal record-keeping. Admin accounts cannot be deleted this way.
- Draft privacy policy, terms and returns policy are included and **must be reviewed before launch**.

## Notifications and email — honesty rules

- Every important event creates an in-app notification (database triggers, so it cannot be skipped).
- Email is only attempted if SMTP is configured. A notification is marked **sent** only after the SMTP server accepts
  the message; otherwise the dashboard shows "Email not sent" / "Email failed".
- WhatsApp buttons open a chat with a pre-filled draft — the site never claims a WhatsApp message was sent.

## Known limitations

See [TESTING_REPORT.md](TESTING_REPORT.md#known-limitations-and-unfinished-work).

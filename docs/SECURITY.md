# Security & privacy

This describes what is implemented. It is not a certification of legal compliance. The privacy policy and other legal documents are **drafts** that must be reviewed by the owner and, ideally, a qualified South African legal professional (POPIA, CPA, ECTA).

## Authentication & sessions
- Passwords are hashed with **Argon2id** (OWASP parameters) via `@node-rs/argon2`. Minimum 10 characters with letters and numbers; owner accounts need 12+.
- Sessions use 256-bit random tokens. Only their SHA-256 hash is stored. Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Sessions last 30 days with sliding renewal, and all sessions are revoked on password reset, password change or suspension.
- Email verification and password-reset tokens are single-use, hashed, and expire (48 h / 1 h). Login timing is equalised for unknown emails, and responses never reveal whether an email is registered.
- Verified email is required before checkout, reviews, questions and quote approval.

## Authorisation
- Role checks run on the server for every admin page, action and API (`src/lib/permissions.ts`). Customers get a 404 for `/admin`.
- Ownership checks on all customer data: orders, repairs, receipts, files and quotes are filtered by the user's ID.

## Input, output & requests
- All server inputs are validated with Zod. Prisma parameterises queries, and raw SQL uses tagged templates only.
- React escapes output. Owner-edited pages use a Markdown renderer that produces no raw HTML. JSON-LD is escaped.
- CSRF: server actions are origin-checked by Next.js, upload/route handlers check the `Origin` header, and cookies are `SameSite=Lax`.
- Security headers: nonce-based Content-Security-Policy, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, HSTS, `nosniff`, a strict Referrer-Policy and a Permissions-Policy. `/admin` and `/account` are `noindex`.
- CSV exports neutralise spreadsheet formulas.

## Rate limiting
Stored in PostgreSQL, so it works across instances: login (per IP and per email), registration, password reset, all public forms, uploads, reviews, repair tracking, checkout and discount checks. Forms also have a honeypot field.

## Uploads
- File type is detected from content (magic bytes), never from the name or browser type. Accepted: JPEG, PNG and WebP images (≤10 MB, ≤8 per submission) and MP4, MOV and WebM video (≤50 MB, 1 per submission).
- Images are decoded and **re-encoded to WebP**. This strips EXIF/GPS metadata and neutralises disguised files.
- Files are stored under random keys outside the web root (or in a private bucket) and served only through `/api/files/:id`, which enforces access. Customer submissions are private to the customer and staff, served with `nosniff` and a restrictive per-file CSP.

## Payments
- No card data ever reaches this server (PayFast hosted payment page, card-only).
- Notifications are verified by signature, merchant ID, amount, and a server-to-server validation call. Processing is idempotent, with duplicate-event protection and database row locks.
- Prices and totals are computed server-side. DB constraints enforce consistent totals. Staff can't mark orders paid, and refunds can't be marked complete without a gateway reference.

## Auditing & logging
- `AuditLog` records admin actions: price changes, status changes, refunds, role changes, suspensions, exports, deletions, settings and content publishing.
- Structured JSON logs. Secrets and card data are never logged.

## Secrets
- All credentials come from environment variables (`.env.example` lists them with no values). `.env` is git-ignored.
- There are no default admin accounts or passwords.
- The app refuses to start with an obviously-development `CRON_SECRET` in production.

## POPIA-oriented features
- Only data needed for the purpose is collected, with consent checkboxes on every form (consent timestamps stored). Newsletter uses double opt-in.
- Privacy policy draft explains what is collected and why, sharing, retention and rights.
- Customers can update their details, set notification preferences (including explicit WhatsApp opt-in) and request deletion. The owner processes deletion requests. Profile data is erased or anonymised, while legally required financial records are kept but unlinked from the login.
- Analytics are cookie-free daily page counts by path. No IP addresses or identifiers are stored.

## Backups
See `docs/DEPLOYMENT.md` §9 for nightly `pg_dump`, off-site copies, upload backups and the restore procedure.

## Known limitations / owner actions
- An **Information Officer** must be registered with the Information Regulator. The privacy policy has a placeholder.
- Have the legal documents reviewed. Flags in the text show the open decisions.
- Two-factor authentication for the owner account is not implemented. Use a strong, unique password and a password manager.
- Malware scanning of uploaded videos is not implemented. Videos are type-checked, stored privately and served with `nosniff`, but not virus-scanned.

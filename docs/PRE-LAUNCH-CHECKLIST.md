# Pre-launch checklist

Work through this list before telling customers about the site.

## Accounts and setup
- [ ] Supabase project created on the **Free** plan; database password saved in a password manager
- [ ] Three migrations applied (SETUP §3); `product-images` and `customer-uploads` buckets exist
- [ ] Site URL and Redirect URLs set in Supabase (SETUP §4a)
- [ ] Email templates replaced (SETUP §4c)
- [ ] **Custom SMTP configured** and a real verification email received (SETUP §4d)
- [ ] Netlify site deployed on the **Free** plan with all environment variables (DEPLOYMENT.md)
- [ ] `NEXT_PUBLIC_SITE_URL` matches the real address exactly
- [ ] Owner account registered and promoted to admin (SETUP §8)
- [ ] `pg_cron` reservation expiry scheduled (SETUP §5)
- [ ] Optional: SMTP env vars on Netlify + `ADMIN_NOTIFICATION_EMAIL`; check Admin → Settings shows "Configured"
- [ ] Optional: Google sign-in configured and tested
- [ ] 2-factor authentication on GitHub, Supabase, Netlify and the owner's email

## Content
- [ ] **Remove demo data** (Admin → Settings) if you loaded it
- [ ] Add real products with real photos and honest defects
- [ ] Check the About page wording (Admin → Website content)
- [ ] Confirm contact details: WhatsApp 064 856 7019, Joshuaweinfas@gmail.com, @Shuaweinfas. Add full social media links (e.g. `Instagram | https://www.instagram.com/...`) in Admin → Website content — the platform for the handle wasn't specified, so no social link is shown yet
- [ ] Confirm only "Closed on Saturdays" is shown — no business hours or exact address anywhere
- [ ] Confirm you have the right to use the hero/social-preview guitar photo (`public/images/hero.jpg`, taken from the original mockup). If unsure, replace it with your own photograph (same file name) and regenerate `public/images/og-default.jpg`
- [ ] Optional: repair prices (Admin → Website content) — otherwise "Quoted after assessment" is shown

## Legal (have a qualified person review)
- [ ] **Privacy policy** — POPIA: information officer details, purposes, operators, **cross-border transfer** (state the Supabase region you chose), retention periods. Consider registering your information officer with the Information Regulator
- [ ] **Terms and conditions** — Consumer Protection Act (second-hand goods, implied quality, returns) and ECTA
- [ ] **Returns/cancellation/reservation policies** — check against the CPA and ECTA (e.g. cooling-off rules for electronic transactions)
- [ ] **ECTA section 43** lists information online suppliers must make available, including an address for the service of legal documents. This conflicts with keeping your physical address private — ask your adviser about options (e.g. a postal address or domicilium arrangement) and add whatever is required
- [ ] Remove the "DRAFT" notes from the legal pages once reviewed (Admin → Website content)

## Final tests on the live site
- [ ] Register with a real email on your phone, verify, sign in, reset password
- [ ] Submit a purchase request; process it end to end in the admin; check the customer view
- [ ] Reserve, sell-your-guitar (with phone photos) and repair booking flows
- [ ] Write, approve and report a review
- [ ] Contact form; WhatsApp buttons open the right chat
- [ ] Download a full backup (Admin → Exports)
- [ ] Test on an iPhone and an Android phone, and on a laptop
- [ ] Clean up test data: decline/cancel test requests; delete test reviews; use Admin → Customers to anonymise test accounts if needed
- [ ] Submit the sitemap (`https://YOUR-SITE/sitemap.xml`) in Google Search Console (free) and create a free Google Business Profile for local search (service-area business, address hidden)

## Known limitations and unfinished work
- No online payments — intentional.
- Customers need an account to submit purchase requests, reservations, seller submissions, repair bookings and reviews (so they can track them and their photos stay private). Guests can browse, use the request cart, ask product questions and use the contact form; WhatsApp is offered as an account-free alternative.
- Email notifications depend on your SMTP setup; without it, notifications are in-app only.
- Automated WhatsApp messages are not implemented (would need the paid WhatsApp Business API) — WhatsApp links are used.
- Orphaned photos: if a customer uploads a photo and then abandons the form, the file stays in private storage. It's harmless but uses space; delete old unused files occasionally in Supabase Storage.
- Notification emails are sent one by one when an action happens; bulk/digest emails aren't implemented.
- Reservation expiry runs when the admin dashboard is opened, or on a schedule if you enable `pg_cron`.
- Free-tier pausing (Supabase) and monthly credits (Netlify) — see FREE-SERVICES-AND-LIMITS.md.
- Only one currency (ZAR) and one language (English, South African spelling).
- Analytics are simple counts, not a full analytics suite.
- Automatic backups are not available on the free plan — manual backups are required.
- Legal documents are drafts and need professional review.
- Items listed under "Not tested" in TESTING-REPORT.md.

# Free services used — and their limits

Budget: **R0 per month.** No paid service, trial or billing is activated anywhere in this project. Limits below were
correct to the best of our knowledge in October 2026, but providers change them — **check each provider's pricing page
before launch and once a year.** None of them asks for a card on the free plan; if one ever does, stop and ask.

## Summary

| Service | Used for | Free? | What happens if a limit is reached |
| --- | --- | --- | --- |
| Supabase (Free plan) | Database, logins, photo storage, scheduled job | Yes | Over quota: Supabase may restrict the project; it does **not** auto-charge on the Free plan |
| Netlify (Free plan) | Hosting & automatic deploys | Yes | Site is paused until the next month when monthly credits run out; no charge |
| GitHub | Code, CI checks, backups | Yes | Actions minutes for private repos: 2 000/month (this project uses far less) |
| Gmail SMTP (optional) | Sending emails | Yes | ~500 emails/day; extra emails fail until the next day (recorded as "Email failed") |
| Google Cloud OAuth (optional) | "Continue with Google" | Yes | — |
| WhatsApp click-to-chat links | Contacting customers | Yes | Normal WhatsApp; no API, no cost |
| Google Fonts (Fraunces, Work Sans) | Typography | Yes, open licence | Fonts are bundled into the site at build time |

## Supabase Free plan — the important limits

- **Database: 500 MB.** Text records are tiny; thousands of products and requests fit comfortably.
- **File storage: 1 GB.** Photos are resized on the customer's/your device to about 150–400 KB each before upload,
  so roughly **2 500–5 000 photos**. Delete photos of old sold items occasionally if you approach the limit
  (Supabase dashboard → Storage shows usage).
- **Bandwidth (egress): ~5 GB/month** (plus cached). Every photo view counts. A typical month for a small shop is well
  below this. If the shop becomes very busy, this is the first limit you'll meet.
- **Monthly active users: 50 000.**
- **Pausing: projects with no activity for about 7 days are paused.** The site then stops working until you click
  **Restore** in the dashboard. The included GitHub backup workflow pings the database daily to prevent this.
- **Backups: the Free plan does not give you downloadable backups.** Use the included encrypted GitHub backup
  ([BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md)).
- **Built-in emails are for testing only** (a handful per hour). Configure your own SMTP (see SETUP 2.5).
- **Image transformations (automatic resizing) are a paid feature** — this project does not use them; it resizes on
  upload instead.
- Free projects: 2 per account.

## Netlify Free plan

- Netlify's free plan uses a monthly **credit** allowance (about **300 credits/month** at the time of writing).
  Credits are used by **production deploys** (each one costs credits — roughly 15), **bandwidth**, **server compute**
  and **requests**. A small shop with a handful of deploys per month should stay well within it.
- **Avoid unnecessary deploys** (each merge to `main` triggers one). Batch changes where possible.
- When credits run out the site is **paused until the next month — you are not charged.** Netlify emails you before that.
- Commercial use is allowed on the free plan.

### Why not Vercel?

Vercel works with this code unchanged, but its free **Hobby** plan is limited to **personal, non-commercial** use.
A shop is commercial, so Netlify is used instead. Cloudflare's free Workers plan has a very small CPU limit per request
that is not a good fit for this framework.

## Things that could cost money (all OFF)

| Feature | Status |
| --- | --- |
| Supabase Pro plan, point-in-time recovery, custom domains for Supabase, image transformations | Not used |
| Netlify Pro / add-ons, Netlify Image CDN beyond free credits | Not used (images are served from Supabase) |
| Online payment gateways (card, PayPal, Stripe, PayFast…) | **Not used — deliberately excluded** |
| WhatsApp Business API (paid per conversation) | Not used — ordinary WhatsApp links instead |
| Paid email services | Not used |
| Custom domain | Optional, ~R150–R300/year from a registrar — only if you decide to buy one |

## Analytics

The site uses **first-party analytics stored in your own Supabase database** — free, cookie-free, no third parties.
Only the event type (e.g. "product viewed"), the product and the page path are recorded — no IP address, user id or
tracking cookie. Visitors with "Do Not Track"/Global Privacy Control enabled are not counted. Counts are therefore
approximate.

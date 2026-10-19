# Free services, limits and manual setup

Budget: **R0 per month.** Every service below has a free plan that this site fits within for a small shop. Limits were researched in October 2026 from the providers' documentation and recent third-party summaries — **providers change their plans, so check the official pricing pages before launch** and every few months.

## Services used

| Service | Used for | Free-plan limits that matter (approximate) | What happens at the limit |
| --- | --- | --- | --- |
| **Supabase** (supabase.com/pricing) | Database, logins, photo storage | 500 MB database; 1 GB file storage; ~5 GB egress/month; 50,000 monthly active users; 2 free projects; max upload 50 MB per file (this site limits photos to 5 MB and resizes them first) | Usage above limits needs a paid plan; Supabase will warn you |
| | | **Projects are paused after about 7 days without activity.** Paused projects can be restored from the dashboard (data is kept) | The website shows errors until you click **Restore** in Supabase |
| | | **No downloadable automatic backups on the free plan** | Use the site's export/backup tools — see BACKUP-AND-RESTORE.md |
| | | Built-in email only reaches your own Supabase team and ~2 emails/hour | Customers don't receive verification emails until you set up SMTP (SETUP §4d) |
| **Netlify** (netlify.com/pricing) | Hosting, deploys from GitHub | Credit-based free plan: **300 credits/month**. At the time of writing: each production deploy ≈ 15 credits; bandwidth ≈ 20 credits per GB; server compute ≈ 10 credits per GB-hour; web requests ≈ 2 credits per 10,000 | **The site is paused until next month** (no charge on the free plan). See DEPLOYMENT §4 for how to save credits |
| **GitHub** | Stores the code | Free private repositories | — |
| **Gmail SMTP** *or* **Brevo** (optional) | Verification, password reset and notification emails | Gmail: a few hundred emails/day for personal accounts. Brevo free: ~300 emails/day | Emails fail to send; the site keeps working with in-app notifications |
| **Google Cloud OAuth** (optional) | "Continue with Google" | Free | — |
| **WhatsApp** | Contact links (`wa.me`) | Free, no integration needed | — |

### Rough capacity estimate
A typical page is a few hundred kilobytes and product photos are resized to roughly 150–400 KB each and served by Supabase. A shop with a few thousand visits a month and a few hundred listed guitars should fit comfortably within the free tiers. If the site becomes much busier, the first limit you are likely to hit is Netlify's monthly credits.

## Deliberately NOT used

| Feature | Why |
| --- | --- |
| Online payments (PayFast, card payments, Stripe, PayPal, etc.) | Business requirement: all payments are arranged privately by EFT. There are no payment packages, scripts or fields in the code. `npm run check:no-payments` verifies this |
| Automated WhatsApp messages (WhatsApp Business API) | Requires Meta business verification and has per-conversation charges; normal WhatsApp links are used instead |
| Paid image optimisation | Photos are resized in the visitor's browser before upload instead |
| Third-party analytics (Google Analytics etc.) | Replaced by private first-party counts (below) |

## Analytics

Analytics are **active** and first-party: the site records only the event name (product view, add to cart, purchase request, reservation request, seller submission, repair booking, enquiry, WhatsApp click, share), the product involved and the page path. **No IP addresses, cookies, user IDs or device fingerprints** are stored, and nothing is recorded if the browser sends "Do Not Track" or "Global Privacy Control". Totals for the last 30 days are on the admin overview.

## Integrations that need manual setup

| Integration | Needed for | Guide |
| --- | --- | --- |
| Supabase project + migrations | Everything | SETUP §2–3 |
| Supabase URL configuration and email templates | Verification and password-reset links | SETUP §4a–4c |
| **Custom SMTP in Supabase** | Customers receiving verification/reset emails (**required**) | SETUP §4d |
| SMTP environment variables in Netlify | Owner/customer notification emails (optional) | SETUP §6 |
| Google OAuth | Google sign-in (optional) | SETUP §4e |
| pg_cron schedule | Expiring reservations on a schedule (recommended) | SETUP §5 |
| First administrator | Admin dashboard | SETUP §8 |
| Netlify site + environment variables | Hosting | DEPLOYMENT.md |
| Custom domain | Later, optional (paid domain) | DEPLOYMENT §5 |

# Cost and dependency report

**Target and expected monthly cost: R0.** No service below needs a credit card on its free plan, and none is activated automatically.

> Free-tier figures change. They were checked in October 2026 via the providers' published information and third-party summaries; the providers' own pricing pages could not be opened from the build environment. **Check each pricing page before launch.**

| Provider | Purpose | Free allowance (approx.) | Important limits | Possible future cost | Free alternative |
| --- | --- | --- | --- | --- | --- |
| **Netlify** (netlify.com/pricing) | Hosting, automatic deploys, HTTPS | 300 credits/month; production deploy ≈ 15 credits; bandwidth, requests and server compute also use credits. Commercial use allowed. | Roughly 20 deploys/month if nothing else used credits. Free plan does not bill overages — usage is capped. | Personal/Pro plans if traffic grows a lot. | Cloudflare Workers/Pages (free, commercial use allowed; needs the OpenNext adapter), Render free web service (slow cold starts). |
| **Supabase** (supabase.com/pricing) | Postgres database, auth, file storage, scheduled jobs | ~500 MB database, ~1 GB file storage, ~5 GB egress, 50 000 monthly active users, 2 active projects. | Projects **pause after ~7 days of inactivity** (prevented by the Maintenance workflow; restorable in one click). Upload size limit 50 MB per file (this site uses 10/25 MB). Free plan has no downloadable automated backups — use the export/backup methods in BACKUP-AND-MIGRATION.md. | Pro (~$25/month) for more storage, daily backups, no pausing. | Self-hosted Supabase or any Postgres (Neon free tier) + separate auth — more work. |
| **Gmail SMTP** | Notification and login emails | ~500 emails/day; requires 2-Step Verification + App Password. | Sender must be the Gmail address; some emails may go to spam. Not designed for bulk mail. | — | **Brevo** free (300/day) once you own a domain (Brevo cannot send from @gmail.com properly). |
| **Google Cloud (OAuth)** | "Continue with Google" | Free. | Consent screen must be published. | — | Email/password only. |
| **GitHub** | Code, CI, migrations, maintenance, optional backups | Free repos; Actions free for public repos; ~2 000 min/month for private. Artifacts storage ~500 MB (private). | Scheduled workflows may be disabled after 60 days of no repository activity (re-enable in Actions). | Paid minutes if heavily used. | Make the repo public (code has no secrets), or run tests locally. |
| **Cloudflare Turnstile** (optional) | Extra spam protection | Free. | — | — | Built-in honeypot + rate limits (already active). |
| **Cloudflare Web Analytics** (optional) | Visitor statistics | Free, cookie-free. | — | — | Built-in counters (already active). |
| **WhatsApp** | Customer contact | wa.me links are free. | Automatic sending is not used. | WhatsApp Business Platform charges for business-initiated messages. | Prefilled links (implemented). |
| **Domain** (optional) | Own web address | Not free. | — | ~R150–R250/year for .co.za (approximate). | Free `*.netlify.app` address. |

## Features that cannot run for R0 — and the alternative used

| Wanted | Why not free | What the site does instead |
| --- | --- | --- |
| Automatic WhatsApp notifications | Meta charges for business-initiated conversations | "WhatsApp customer" buttons with a ready-written message; email + in-account notifications are automatic. |
| Supabase automated daily backups | Paid plans only | Admin full export + optional encrypted weekly GitHub backup + manual CLI dump. |
| Supabase image resizing | Paid feature | Images are resized in the browser before upload (large + thumbnail). |
| Guaranteed scheduled jobs when the project is paused | Paused projects don't run | Expiry also happens on page loads; Maintenance workflow keeps the project active. |

## What happens at a limit

- **Netlify credits used up:** the free plan does not charge you; the site may be paused until the next monthly reset or an upgrade. Keep deploys low.
- **Supabase storage/database full:** writes fail (uploads, new records). Delete old submission photos; export and archive old records.
- **Email limit:** emails fail for the rest of the day; they are marked "failed" in the Email log and retried by the Maintenance task.

## Avoiding accidental billing

Never enter card details. Never click Upgrade/Pro. Check each dashboard's Usage page monthly (Netlify → Usage & billing; Supabase → Organization → Usage).

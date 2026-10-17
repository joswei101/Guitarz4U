# Launch checklist: what the owner still needs to do

The software is built and tested locally. Nothing below has been done yet: **the site is not deployed, no domain is connected and payments are not live.**

## Accounts & credentials (costs are rough estimates; check current pricing)

| # | Item | Why | Cost (approx.) |
| --- | --- | --- | --- |
| 1 | **PayFast merchant account** (verified) | Card payments in ZAR | No monthly fee on the standard plan; per-transaction card fees apply (check payfast.io) |
| 2 | **Hosting**: VPS (xneelo / Afrihost / Hetzner) or Render/Railway | Run the site | ~R150–R450/month |
| 3 | **PostgreSQL** (bundled with the VPS, or Neon/Supabase) | Database | free tier → ~R100–R500/month |
| 4 | **Domain** (`.com`) | Your web address | ~R200–R300/year |
| 5 | **Email provider** (Brevo / Resend) + domain verification (SPF/DKIM) | Verification, order and repair emails | free tier to start |
| 6 | **Cloudflare R2** private bucket (recommended for managed hosting) | Photos & videos | free tier ~10 GB |
| 7 | *(optional)* Meta WhatsApp Business Cloud API + approved templates | Automated WhatsApp status messages | Meta charges per conversation |
| 8 | *(optional)* Anthropic API key | AI price estimates | pay per use (small) |
| 9 | Off-site backup storage | Database & upload backups | free–low |

## Configuration steps
- [ ] Fill in production environment variables (`.env.example` lists all of them).
- [ ] Deploy (`docs/DEPLOYMENT.md` §2), then run migrations and the seed.
- [ ] Create the owner account with `scripts/create-admin.ts` (strong, unique password).
- [ ] Set up the maintenance cron (every 5 min) and nightly backups. Test a restore once.
- [ ] Connect the domain, HTTPS and `APP_URL`; submit the sitemap to Google Search Console.
- [ ] PayFast **sandbox** test purchase from the live URL, then switch to live and do a real R5–R10 purchase and refund.
- [ ] Send yourself every email type (register, reset, order, repair quote) and check spam placement.
- [ ] Add real products with real photos. Do **not** run `SEED_DEMO` in production.
- [ ] Review *Admin → Settings*: accepted sell item types, repair intake on/off, default warranty wording.

## Business & legal decisions (flagged in the policy drafts as `[OWNER TO CONFIRM]` / `[LEGAL REVIEW]`)
- [ ] **Have all policies reviewed** (privacy, terms, returns/refunds/cancellations, condition disclosure, repair terms and warranty, purchase-enquiry terms, collection policy). They are drafts, not certified compliant with POPIA, CPA or ECTA.
- [ ] Register an **Information Officer** with the Information Regulator and name them in the privacy policy.
- [ ] Legal name or registration of the business, VAT status (do prices include VAT?), and a physical address for legal notices (ECTA s43; may be provided on request, so take advice).
- [ ] Returns: how ECTA's cooling-off right applies to your collection-only sales, your window for "not as described" claims, and change-of-mind returns (yes/no).
- [ ] Whether any gateway fees are deducted from refunds (the CPA may require full refunds).
- [ ] Repair warranty: standard duration and conditions (set per quote; the default wording is editable), whether there's an assessment fee, and the policy for uncollected instruments.
- [ ] Collection: whether ID is required, how long paid items are held, and what happens if they're not collected.
- [ ] Second-hand goods record-keeping obligations for buying used items (check with a legal adviser).
- [ ] Record retention period for financial records (confirm with your accountant; typically 5 years).
- [ ] Confirm the hero photograph (`public/images/hero.webp`, from the original mock-up) is yours or licensed for commercial use. Replace it if not.
- [ ] Social media links: only the handle "Shuaweinfas" is shown. Provide the platform URLs (Instagram/Facebook/TikTok) to link them.

## Recommended later improvements
- Two-factor authentication for staff accounts.
- Virus scanning for uploaded videos.
- Automated PayFast refund API integration (refunds are currently processed in the PayFast dashboard and recorded here with the gateway reference).
- Newsletter campaign sending from the dashboard (subscribers can currently be exported as CSV to a mailing tool).

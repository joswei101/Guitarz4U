# Pre-launch checklist

## Accounts and setup
- [ ] Code merged to `main`; Netlify deploys from `main`.
- [ ] Supabase project created; database set up (Phase C); buckets visible.
- [ ] All Netlify environment variables set (Phase D); `/api/health` says connected.
- [ ] Supabase Auth: Confirm email ON, min password 8, Site URL and Redirect URLs set, custom SMTP set.
- [ ] Google sign-in configured and tested.
- [ ] Owner account created with `bootstrap_owner` (Phase E6).
- [ ] GitHub secrets for migrations (`SUPABASE_*`) and maintenance (`SITE_URL`, `CRON_SECRET`) added; workflows green.
- [ ] Optional: encrypted backup workflow secrets added and a first backup downloaded.

## Business decisions (owner)
- [ ] **Repair warranty period** set in Admin → Settings (and terms/exclusions).
- [ ] All legal policies read, edited to match how you work, and **checked by a qualified professional** (POPIA, Consumer Protection Act, ECTA, Second-Hand Goods Act, tax). Then tick "reviewed" for each and in Settings.
- [ ] Retention periods in the privacy policy confirmed with your accountant.
- [ ] Decide whether you offer any voluntary returns period (Returns policy).
- [ ] About page: add your own story.
- [ ] Information Officer registration with the Information Regulator considered (POPIA).

## Content
- [ ] Contact details correct (WhatsApp 064 856 7019, Joshuaweinfas@gmail.com, @Shuaweinfas, Sandringham, Johannesburg). No street address anywhere.
- [ ] FAQs reviewed.
- [ ] No test products, test reviews or test accounts on the live site.
- [ ] First real guitars listed with real photos and honest defects (or leave empty — the empty state is designed for this).

## Testing on the live site
- [ ] Phase H checklist completed on a phone and a computer.
- [ ] Test email received from Admin → Notifications.
- [ ] A test reservation, enquiry, seller submission and repair made and then cancelled/cleaned up.

## After launch
- [ ] Google Search Console: add the site (https://search.google.com/search-console), verify with the HTML-tag or DNS method, and submit `https://YOUR-ADDRESS/sitemap.xml`.
- [ ] Optional: Google Business Profile for Sandringham (service-area business, hide address).
- [ ] Monthly: download a backup; check Netlify and Supabase usage.

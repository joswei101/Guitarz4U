# Pre-launch checklist

Tick each item before telling customers about the website.

## Accounts & configuration
- [ ] Code merged into `main`; GitHub **CI** check is green
- [ ] Supabase project created on the **Free** plan; all 4 migration files run in order
- [ ] Netlify site deployed from `main`; site name chosen (e.g. `guitarz4u.netlify.app`)
- [ ] Netlify environment variables set (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- [ ] Supabase **Site URL** and **Redirect URLs** match the live address
- [ ] Supabase **custom SMTP** configured (otherwise customers won't get confirmation emails)
- [ ] Email templates switched to the token-hash links (recommended)
- [ ] Optional: email notifications (`SUPABASE_SECRET_KEY` + `SMTP_*` in Netlify) — test that you receive an alert
- [ ] Optional: Google sign-in configured, then `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`

## Admin & security
- [ ] Registered your own account and promoted it with `select public.promote_to_admin('…')`
- [ ] Signed in as a normal test customer and confirmed `/admin` shows "page not found"
- [ ] Supabase secret key is **only** in Netlify/GitHub secrets — not in any file in GitHub
- [ ] Repository set to Private (recommended)

## Content
- [ ] **Demo data removed** (Admin → Settings → Remove all demo data)
- [ ] Real products added with your own photos, honest condition grades and defects
- [ ] Home-page photo uploaded (one you own or have permission to use)
- [ ] About text checked (it currently mentions Shua Weinfas as founder — confirm wording)
- [ ] Contact details correct: WhatsApp 064 856 7019, Joshuaweinfas@gmail.com, @Shuaweinfas, "Closed on Saturdays."
- [ ] **Collection address** and **bank details** added in Settings (private)
- [ ] Repair prices: leave empty (quoted after assessment) or enter as guides ("From R…")
- [ ] Announcement bar empty or correct

## Legal (important)
- [ ] Privacy policy, terms and returns policy **reviewed by a qualified person** and final versions pasted into
      Admin → Website content (the "Draft" notice then disappears)
- [ ] Information Officer details correct in the privacy policy (POPIA)
- [ ] Returns periods / repair workmanship guarantee in the draft match what you actually offer

## Backups & monitoring
- [ ] GitHub secrets added and the **Backup & keep-alive** workflow ran successfully once
- [ ] Backup passphrase stored in a password manager
- [ ] Downloaded and decrypted one backup to check it opens

## Final test on your phone
- [ ] Register a test customer, confirm email, sign in, reset password
- [ ] Add an item to the cart and submit a request → appears in the dashboard
- [ ] Request a reservation → approve it → item shows "Reserved"
- [ ] Submit a test seller form with a photo; send an offer; accept it as the customer
- [ ] Book a test repair; send a quote; accept it
- [ ] Submit and approve a review
- [ ] Delete the test records/accounts afterwards (Customers & privacy, or archive)
- [ ] Share a product link on WhatsApp and check the preview
- [ ] Submit the sitemap (`/sitemap.xml`) in Google Search Console (free) and create a free Google Business Profile
      using service-area only (no street address)

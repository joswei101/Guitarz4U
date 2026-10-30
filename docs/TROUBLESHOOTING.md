# Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Netlify build fails: "Supabase is not configured" (during page load) or pages show "Something went wrong" | Missing/misspelt environment variables | Check names in Netlify exactly match `.env.example`. Redeploy after changes. |
| Netlify build fails during `npm ci` | Temporary npm/network issue, or lock file mismatch | Deploys → Retry deploy. If repeated, make sure `package-lock.json` is in the repository. |
| `/api/health` shows `"database":"unreachable"` | Supabase project paused, or wrong URL/key | Supabase dashboard → project → **Restore project**. Check `NEXT_PUBLIC_SUPABASE_URL` and keys. Run the Maintenance workflow to keep it active. |
| SQL Editor error "relation already exists" | The setup file was run twice | Nothing to do if the first run succeeded. To start completely fresh, create a new Supabase project. |
| Can't register: no confirmation email | Supabase custom SMTP not set, or rate limit | Phase E3. Check Supabase → Authentication → Logs. Look in spam. |
| Confirmation/reset link shows "invalid or has expired" | Link opened in a different browser, used twice, or older than 1 hour; or Site URL / Redirect URLs wrong | Request a new link and open it on the same device. Check Authentication → URL Configuration. |
| Google sign-in: "redirect_uri_mismatch" | Redirect URI in Google Cloud doesn't exactly match Supabase's callback | Copy the callback URL from Supabase → Providers → Google into Google Cloud → Clients → Authorised redirect URIs. |
| Google sign-in: "Unsupported provider" / "provider is not enabled" | Google not enabled in Supabase | Enable it and paste Client ID/Secret (Phase E4). |
| Google refuses an "authorised domain" | Google restrictions on some shared subdomains | Leave it for now (sign-in can still work), or add a custom domain (Phase J). |
| Notification emails "failed" in Admin → Notifications | Wrong App Password, 2-Step Verification off, or daily limit | Create a new App Password; update `SMTP_PASSWORD` in Netlify; redeploy; click Retry. |
| Emails "skipped" | `SMTP_HOST` not set | Add SMTP variables (Phase D/F). |
| "Too many submissions" | Rate limit hit (spam protection) | Wait an hour. Limits per hour per connection: enquiries 5, offers 6, messages 6, seller 4, repair 4, sign-in 20 per 15 min. |
| "That was very quick" | Form submitted within 2.5 seconds (bot protection) | Wait a moment and press submit again. |
| Photo upload fails | Wrong file type or too large; storage full | Use JPEG/PNG/WebP (HEIC for customers); ≤10 MB photos, ≤25 MB videos. Check Supabase Storage usage. |
| Can't publish a product | Description not approved | Tick "I have checked and approve this description", Save, then Publish. |
| Repair status won't change to "In progress" | No approved quote | Send a quote and get/record approval first (by design). |
| Can't complete a repair | An extra-cost quote is awaiting decision | Record the customer's decision first. |
| `/admin` sends me to the homepage | Account isn't owner/staff | Run `select public.bootstrap_owner('your-email');` (Phase E6) — only works if no owner exists. Otherwise ask the owner to grant access. |
| Lost access to the owner account | — | Reset password via "Forgotten your password". If the email itself is lost, in Supabase SQL Editor: `update public.profiles set role='owner' where email='new-owner@example.com';` (only in the Supabase dashboard). |
| Reservation didn't expire exactly at the time | Checked every 10 min and on page loads | Normal; it expires on the next check. |
| Scheduled GitHub workflows stopped | GitHub disables schedules after 60 days without repository activity | GitHub → Actions → Maintenance → Enable workflow. |
| Netlify site suddenly offline near month end | Free credits used up | Check Netlify → Usage. Reduce deploys; it resets monthly. Do not add a card unless you choose to upgrade. |

Still stuck? Copy the exact error message (no passwords or keys!) and ask a developer or an AI assistant.

# Maintenance guide

## Day to day (no code needed)

| Task | Where |
| --- | --- |
| Add a guitar | Admin → Inventory → **Add a product** → save as draft → add photos → **Publish** |
| Edit price, description, defects, photos | Admin → Inventory → click the guitar |
| Feature a guitar on the home page / special offer | Tick **Feature** / enter a **Was price** higher than the price |
| Handle a purchase request | Admin → Purchase requests → open it → contact the customer (WhatsApp/email buttons) → update the status |
| Confirm an EFT | Only after checking your own bank app → status **Payment confirmed by administrator** (tick the confirmation box) |
| Reservations | Admin → Reservations → approve/decline. Hold period: Admin → Settings |
| Guitars offered to you | Admin → Seller submissions → review photos → make an offer / request info / decline |
| Repairs | Admin → Repair bookings → send a quote → when accepted and agreed, mark **Approved** → In progress → Awaiting collection → Completed |
| Reviews | Admin → Reviews → approve, reject or remove; handle reports |
| Website text, announcement bar, contact details, repair prices | Admin → Website content |
| Privacy requests | Admin → Customers & privacy |
| Backups | Admin → Exports & backups (weekly) — see BACKUP-AND-RESTORE.md |

### Inventory rules built into the system
- Approving a purchase request reserves its guitars; completing it marks them **sold**; declining or cancelling releases them (unless another approved hold exists).
- Sold and archived guitars disappear from the shop but stay in **Inventory → Sold archive**.
- Real stock can't be deleted (only archived), so your sales history is preserved. Drafts and demo listings can be deleted.

### Photo tips
Photograph in daylight against a plain background; include front, back, headstock (front and back), neck/frets, electronics cavity if relevant, and **close-ups of every defect**. Photos are automatically resized to 1600 px and compressed before upload.

## Weekly / monthly
- **Weekly:** download a backup; clear new enquiries and reviews.
- **Monthly:** full database dump; check Supabase **Reports/Usage** and Netlify **Usage**; remove old backups you no longer need (POPIA).
- If Supabase emails you that the project will be **paused** for inactivity, open the dashboard (or the site) to keep it active. If it is paused, click **Restore project**.

## Software updates (every few months, or for security alerts)
GitHub's Dependabot can alert you to security updates. To update:

```bash
npm outdated
npm update                       # minor/patch updates
npm run lint && npm run typecheck && npm run build
npx supabase start && npm run test:db && npm run test:e2e
```

Merge to `main` only when all checks pass. Major upgrades (e.g. Next.js 17) should be done on a separate branch and tested with a Netlify preview deploy first.

## Changing the database
Never edit migration files that are already applied to the live project. Add a new file in `supabase/migrations/` (e.g. `20270101000000_add_colour_filter.sql`), test locally with `npx supabase db reset` and the tests, then apply it with `npx supabase db push` (or paste into the SQL Editor). Regenerate types with `npm run db:types`.

## Security practices
- Only give the admin role to people you trust (SETUP §8); every role change is audited.
- Keep `SUPABASE_SECRET_KEY` only in Netlify's environment variables. If it ever leaks, rotate it in Supabase → API Keys and update Netlify.
- Use a strong, unique password and enable 2-factor authentication on GitHub, Supabase, Netlify and your email account.
- Never post banking details on the website or in the customer message box; send them privately.

## Moving to another host

The code is portable: a standard Next.js app plus a standard PostgreSQL database.

**Hosting (Netlify → elsewhere)**
1. Create the site on the new host (any Node.js 20+ host, Vercel, Cloudflare with OpenNext, a VPS with `npm run build && npm start`).
2. Copy the environment variables.
3. Point your domain's DNS at the new host; update `NEXT_PUBLIC_SITE_URL` and Supabase's Site URL/Redirect URLs.

**Database (Supabase → another Supabase project or Postgres)**
1. Take a full dump and restore it (BACKUP-AND-RESTORE.md).
2. Copy photos with `rclone`.
3. Update the Supabase URL and keys in your host's environment variables.

Moving away from Supabase entirely is possible but larger work: authentication, storage and row-level-security helpers (`auth.uid()`) would need replacing.

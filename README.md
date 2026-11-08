# Guitarz4U

Website for **Guitarz4U**: a second-hand guitar shop and guitar repair workshop in Johannesburg. Prices are in rand (ZAR).

## What it does

**For customers**
- **Shop:** browse inspected guitars and filter by type, condition, price and keyword. Each guitar has a photo gallery and a spec sheet.
- **Reserve a guitar:** no online payment. The guitar is held immediately (it can't be double-booked) and the customer gets a `G4U-XXXXXX` reference. Payment is by EFT or cash on collection, and courier delivery is optional.
- **Repairs:** a services menu with prices across Setups & Restrings, Fretwork, and Structural & Finish. The booking form gives a running estimate and the customer gets an `RPR-XXXXXX` reference.
- **Track a repair:** the customer enters their reference and email to see the status, a progress bar, the quote, workshop notes and the full history.
- **Contact form, reviews** (shown only after you approve them), WhatsApp buttons everywhere, and an about page with policies (returns, warranty, POPIA).

**For the owner**: go to `/admin`
- Dashboard with everything that needs attention, plus sales and repair income totals.
- **Inventory:** add, edit, hide or delete guitars, upload and reorder photos, and feature guitars on the home page.
- **Reservations:** Pending → Confirmed (emails your bank details to the customer) → Completed (guitar marked sold). Cancelling puts the guitar back on sale.
- **Repairs:** change the status (Requested, Booked, Received, In progress, Awaiting parts, Ready, Collected), set the quote, and add notes. Customers are emailed on each status change. You can also book in walk-in customers.
- **Repair services:** edit prices, descriptions and turnaround times, or add and remove services.
- **Messages and Reviews** inboxes.
- **Settings:** phone, WhatsApp number, email, hours, bank details, delivery note, social links, an announcement bar, and the admin password.

## Run it locally

Requires **Node.js 22.13 or newer** (it uses Node's built-in SQLite, so no database server is needed).

```bash
npm install
ADMIN_PASSWORD=choose-a-password npm start
# open http://localhost:3000, admin at http://localhost:3000/admin
```

If `ADMIN_PASSWORD` isn't set, a random password is generated and printed in the console on first start. You can change it later under Admin → Settings.

The site starts with **8 sample listings** so it doesn't look empty. Remove them from the admin dashboard with one click before you go live.

Run the tests with `npm test`.

## Configuration (environment variables)

| Variable | Purpose |
|---|---|
| `PORT` | Port to listen on (default 3000) |
| `ADMIN_PASSWORD` | Owner login password. If set, it always overrides the password stored in the database |
| `DATA_DIR` | Where the SQLite database and uploaded photos are stored (default `./data`). **Must be persistent storage in production** |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional email notifications. For Gmail use `smtp.gmail.com`, port `465`, and an [App Password](https://support.google.com/accounts/answer/185833) |
| `NOTIFY_EMAIL` | Where owner notifications are sent (defaults to the email set in Settings) |

Without SMTP the site still works fully: every reservation, booking and message shows up in the admin panel. Emails are simply skipped.

## Deploying

The site needs a host that runs Node and has a **persistent disk**:

- **Render:** connect this repo. `render.yaml` sets up a web service with a 1GB disk. Set `ADMIN_PASSWORD` (and SMTP variables if you want email) in the dashboard.
- **Railway / Fly.io:** run `npm start`, attach a volume and point `DATA_DIR` at it.
- **VPS:** run `npm start` behind nginx or Caddy for HTTPS, using pm2 or systemd.

Back up the `DATA_DIR` folder regularly. It holds all your data.

## Project layout

```
server.js            Express app: public API, admin API, static files
src/db.js            SQLite schema, default settings and seed data
src/auth.js          Admin password hashing and signed session cookie
src/mailer.js        Optional SMTP email notifications
public/              Website pages (index, shop, guitar, repairs, track, about, contact, admin)
public/js/common.js  Shared header/footer and helpers
public/js/admin.js   Owner admin panel
test/                API tests (node --test)
legacy/              The previous single-file version of the site
```

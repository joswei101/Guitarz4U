// DRAFT policy text. These are sensible starting points written with South
// Africa's POPIA and Consumer Protection Act in mind, but they are NOT legal
// advice. Have them reviewed before launch. They can be edited in
// Admin → Website content without touching code.

export const POLICY_DRAFT_NOTICE =
  "Draft — this policy should be reviewed by a qualified person before the website goes live.";

export const PRIVACY_POLICY = `_Last updated: ${"{{date}}"}_

Guitarz4U ("we", "us") respects your privacy. This policy explains how we handle personal information in line with the Protection of Personal Information Act, 2013 (POPIA).

## Who is responsible

Guitarz4U, Sandringham, Johannesburg, Gauteng, South Africa. Contact: Joshuaweinfas@gmail.com or WhatsApp 064 856 7019. The owner acts as the Information Officer.

## What we collect and why

| Information | Why we need it |
| --- | --- |
| Name, email, phone/WhatsApp number | To create your account and contact you about your requests |
| Purchase requests, reservations, seller submissions, repair bookings and messages | To handle what you asked us to do and keep business records |
| Photos you upload of your guitar | To assess a guitar you want to sell or have repaired |
| Reviews you write | To publish them (after moderation) with your chosen display name |
| Anonymous usage counts (page and product views) | To understand which pages and products are popular |

We do **not** collect card or bank details through this website and no online payments are processed.

## Analytics and cookies

We use first-party, cookie-free analytics stored in our own database. We record only the type of event (for example "product viewed"), the product and the page address — never your IP address or identity. If your browser sends a "Do Not Track" or Global Privacy Control signal, nothing is recorded. We use only essential cookies to keep you signed in. Your request cart is stored in your own browser.

## Who we share information with

We do not sell or rent your personal information. We use these service providers (operators) to run the website:

- **Supabase** — database, sign-in and photo storage
- **Netlify** — website hosting
- **Email provider** (if email notifications are enabled) — to send notification emails
- **Google** — only if you choose "Continue with Google"

Some providers may store data outside South Africa; we use reputable providers with appropriate safeguards.

## Your address and ours

Our collection address is never published. It is shared privately once a purchase or appointment has been agreed.

## How long we keep information

We keep account information while your account is active. Records of purchases, offers and repairs may be kept for up to five years for accounting, tax and dispute purposes. If you ask us to delete your account, we delete your login, wishlist and notifications and remove your contact details from the records we must keep.

## Your rights

You may ask to access, correct or delete your personal information, object to processing, or withdraw consent. You can:

- Download a copy of your data from **My account → Privacy & data**
- Request account deletion from the same page
- Contact us using the details above

You may also complain to the Information Regulator of South Africa (https://inforegulator.org.za).

## Security

Access to customer information is restricted to the owner. The website uses encrypted connections (HTTPS), secure sign-in, and database rules that let each customer see only their own records.

## Changes

We may update this policy. The latest version will always be on this page.`;

export const TERMS = `_Last updated: ${"{{date}}"}_

These terms apply to your use of the Guitarz4U website. By using the site you agree to them.

## 1. About the website

Guitarz4U sells pre-owned guitars and selected equipment, buys guitars from the public, and offers guitar repairs. Prices are shown in South African rand (ZAR).

## 2. No online payments

This website **does not take payments**. Adding items to the request cart, submitting a purchase request or requesting a reservation is an **enquiry only**. A sale is concluded only when Guitarz4U confirms it with you directly and payment has been received by the agreed method (normally EFT). We will never ask for card details on this website.

## 3. Availability and pricing

Most items are one of a kind. Availability is checked when you submit a request, but an item may sell in the meantime. Prices may change before a sale is confirmed. If a pricing error occurs we will tell you before accepting your request.

## 4. Second-hand goods

All products are second-hand unless stated otherwise and may show signs of wear consistent with their age and use. We describe the condition and known defects honestly — please read each listing carefully and ask questions before buying. See the [Returns, condition & reservations policy](/policies/returns).

## 5. Reservations

A reservation request is not a confirmed reservation. If approved, an item is held for the period we confirm. Unpaid reservations expire automatically and the item becomes available again.

## 6. Selling your guitar to us

Submitting a guitar does not oblige us to buy it, or you to sell it. Offers are made personally after assessment (usually including an inspection) and may be valid for a limited time. You confirm you are the lawful owner of any guitar you offer to sell and that it is not stolen or subject to finance. We do not buy loose parts.

## 7. Repairs

Repair quotes are estimates based on our assessment. Work begins only after you approve the quote and we confirm. If further problems are found, we will contact you before doing additional work. Guitars not collected within 60 days of notice of completion may be subject to storage arrangements — we will always contact you first.

## 8. Accounts and reviews

Keep your password secure. Reviews must be honest and respectful; we moderate reviews before publishing and may remove content that is abusive, misleading or unrelated.

## 9. Liability

Nothing in these terms limits rights you have under the Consumer Protection Act. Otherwise, to the extent allowed by law, Guitarz4U is not liable for indirect losses arising from use of the website.

## 10. Contact

Joshuaweinfas@gmail.com · WhatsApp 064 856 7019. Closed on Saturdays.`;

export const RETURNS_POLICY = `_Last updated: ${"{{date}}"}_

## Second-hand condition

Every guitar is inspected before listing and given a condition grade:

- **Mint** — as new; no visible wear.
- **Excellent** — very light signs of use.
- **Very good** — minor cosmetic wear such as light scratches.
- **Good** — noticeable cosmetic wear; fully functional.
- **Fair** — heavy wear or minor functional issues.
- **Needs repair** — sold as-is for repair or restoration.

Specific defects, repairs and known history are listed on each product page. Photos form part of the description. Please read listings carefully and ask questions before buying — we're happy to send more photos or arrange a viewing.

## Purchase requests and payment

Submitting a request is not a purchase and no payment is taken online. We confirm availability and payment arrangements with you personally. Ownership passes once payment has cleared.

## Reservations

- A reservation request must be approved by Guitarz4U before it is confirmed.
- Approved reservations are held for the period we confirm (usually a few days).
- If payment is not arranged within that period, the reservation expires and the item is released.
- You can cancel a reservation from your account at any time.

## Returns and refunds

Because items are second-hand and sold as described, returns are considered case by case. Your rights under the Consumer Protection Act apply, including where goods are not as described or have a defect that was not disclosed.

- Contact us within **5 working days** of collection if an item is materially different from its description.
- Items must be returned in the same condition as collected.
- Approved refunds are paid by EFT once the item has been returned and checked.
- Items sold as **Needs repair** are sold as-is for their disclosed faults.

## Collection and delivery

Guitars are normally collected by appointment. The collection address is shared privately once the sale is agreed. Courier delivery can be arranged at the buyer's cost and risk.

## Repairs

Repair work is guaranteed for workmanship for **30 days** from collection (excluding new damage, normal wear and strings). Contact us if a problem returns.

## Contact

Joshuaweinfas@gmail.com · WhatsApp 064 856 7019.`;

export function withDate(text: string, date: string) {
  return text.replaceAll("{{date}}", date);
}

// Default text for owner-editable pages. The owner can override any of these
// from Admin -> Website content without editing code. Uses simple Markdown.
//
// The privacy policy, terms and policies are DRAFTS written in good faith.
// They have NOT been reviewed by a lawyer. Have them reviewed for POPIA, the
// Consumer Protection Act (CPA) and the Electronic Communications and
// Transactions Act (ECTA) before launch.

export type EditablePage = {
  slug: string;
  title: string;
  description: string;
  body: string;
  draftLegal?: boolean;
};

const PAYMENT_PARAGRAPH =
  "> Guitarz4U does not process online payments. If your purchase request is approved, payment will be arranged privately by EFT with the owner. Please wait for confirmation before making payment. Your order is not confirmed until Guitarz4U has approved it and confirmed the arrangements.";

export const DEFAULT_PAGES: Record<string, EditablePage> = {
  about: {
    slug: "about",
    title: "About Guitarz4U",
    description: "Guitarz4U is a small, owner-run second-hand guitar business in Sandringham, Johannesburg.",
    body: `Guitarz4U is a small, owner-run guitar business based in Sandringham, Johannesburg. We buy and sell pre-owned electric, bass, acoustic and classical guitars, and we repair and set them up too.

## Second-hand equipment, first-hand service

Buying a used guitar should feel as personal as buying from a friend who knows guitars. Every request on this website is read and answered by the owner — not a call centre, and not an automated checkout.

## What we do

- **Sell pre-owned guitars** — each listing describes the condition honestly and discloses known wear, damage and defects.
- **Buy guitars** — working, broken or incomplete electric, bass, acoustic and classical guitars. We do not buy loose parts on their own.
- **Repairs and setups** — from fresh strings to electronics, hardware, body work and fretwork, always assessed and quoted before work begins.

## How we work

- No online payments. Purchases are requested online and payment is arranged privately by EFT only after the owner approves your request.
- Collection is arranged privately once your purchase is confirmed. For everyone's safety and privacy, we don't publish our exact address.
- We are closed on Saturdays.

Questions? [Get in touch](/contact) — WhatsApp is usually the quickest way to reach us.`,
  },

  "how-it-works": {
    slug: "how-it-works",
    title: "Buying and selling process",
    description:
      "How purchase requests, private EFT payments, reservations, collection and selling your guitar work at Guitarz4U.",
    body: `## Buying a guitar

1. **Browse the shop.** Each listing shows photographs, the condition rating and any disclosed defects.
2. **Add guitars to your request cart.** This is not a checkout — nothing is charged.
3. **Submit a purchase request** with your contact details and an optional message. You'll need a free account so you can track your request.
4. **We review your request** and confirm whether the guitar is still available.
5. **We contact you privately** on your preferred channel (usually WhatsApp or email) to confirm the final price and collection arrangements.
6. **We send you our EFT details privately.** Our banking details are never published on this website.
7. **You pay by EFT** using your own banking app — only after we've approved your request.
8. **We check our bank account** to confirm the funds have arrived. Only then do we mark your payment as confirmed.
9. **Collection.** We confirm the collection arrangements privately and your request is marked complete when you collect.

${PAYMENT_PARAGRAPH}

## Purchase request statuses

- **Request submitted** — we've received your request.
- **Under review** — we're checking the guitar and your request.
- **Awaiting customer response** — we've contacted you and are waiting to hear back.
- **Purchase approved** — we've agreed to sell you the guitar.
- **Awaiting private EFT payment** — we've sent you EFT details privately.
- **Payment confirmed by administrator** — we've personally confirmed receipt of your EFT.
- **Ready for collection** — collection arrangements have been confirmed.
- **Completed**, **Declined** or **Cancelled**.

## Reservations

You can ask us to hold an available guitar for a short period. A reservation request is **not confirmed until we approve it**, and approved reservations expire after the hold period shown in your account. Only one reservation can be approved per guitar.

## Collection

${"Our exact collection address is shared privately only after a purchase has been approved and collection arrangements have been confirmed."} We're based in Sandringham, Johannesburg, and we're closed on Saturdays.

## Selling your guitar to us

1. Complete the [sell your guitar](/sell) form with photographs and honest details (or send them on WhatsApp).
2. We review every submission personally.
3. We may ask for more information, decline, or make you a personal offer.
4. You can accept or decline an offer in your account.
5. If we agree, we'll arrange the next steps with you privately.

Submitting a guitar is not an agreement for us to buy it, and we never promise a price before we've reviewed it.`,
  },

  policies: {
    slug: "policies",
    title: "Returns, cancellations, condition and reservation policies",
    description: "Guitarz4U policies for second-hand condition, returns, cancellations, reservations and collection.",
    draftLegal: true,
    body: `> DRAFT — these policies must be reviewed by a qualified person before launch. Nothing here limits any rights you have under the Consumer Protection Act, 2008, where it applies.

## Second-hand condition

All instruments are second-hand. They may show wear consistent with previous use, such as scratches, dings, fret wear or worn hardware. We disclose known defects and damage in each listing and rate condition as follows:

- **Mint / as new** — little or no visible wear.
- **Excellent** — light signs of use only.
- **Very good** — some cosmetic wear; plays well.
- **Good** — noticeable cosmetic wear; still a solid player.
- **Fair** — heavy wear and/or minor functional issues, clearly disclosed.
- **Project / needs repair** — broken, incomplete or not working; sold as described for repair or restoration.

Please read the description and defects carefully and ask us questions before you buy. You are welcome to inspect the guitar when you collect it.

## Purchase requests

A purchase request is not a confirmed sale. We may decline a request, for example if the guitar has already been sold or reserved.

## Cancellations

- You can cancel a purchase request online while it is awaiting review or payment, or by contacting us.
- Please don't make an EFT payment until we've approved your request and sent you our details privately.
- If a purchase is cancelled after you've paid, contact us and we'll arrange a refund in line with your rights and the circumstances.

## Returns

If there's a problem with your guitar that wasn't disclosed in the listing, contact us as soon as possible after collection. We'll work with you to find a fair solution, in line with applicable consumer law.

## Reservations

- Reservation requests must be approved by us before they're confirmed.
- Approved reservations are held for a limited period (shown in your account) and then expire automatically.
- Only one reservation can be approved per guitar.
- You can cancel a reservation from your account at any time.

## Collection

Collection is arranged privately after your purchase is confirmed. Our exact address is never published online. We're closed on Saturdays.`,
  },

  privacy: {
    slug: "privacy",
    title: "Privacy policy",
    description: "How Guitarz4U collects, uses and protects personal information in line with POPIA.",
    draftLegal: true,
    body: `> DRAFT — this privacy policy must be reviewed against the Protection of Personal Information Act, 2013 (POPIA) before launch.

**Responsible party:** Guitarz4U, Sandringham, Johannesburg, Gauteng. **Information officer:** the owner, contactable at Joshuaweinfas@gmail.com.

## What we collect

- **Account information:** name, email address, phone number and preferred contact method.
- **Requests you make:** purchase requests, reservations, seller submissions (including photographs), repair bookings (including photographs), reviews, enquiries and messages.
- **Technical information:** a session cookie that keeps you signed in, and a list of recently viewed items and your request cart stored only in your own browser.
- **Anonymous usage counts:** we count events such as product views and request submissions. We do **not** record IP addresses, user IDs or advertising identifiers for analytics, and we respect "Do Not Track" and Global Privacy Control signals.

We never ask for, collect or store card details, banking passwords or online banking credentials. Payments are arranged privately by EFT.

## Why we use it

- To respond to and manage your purchase requests, reservations, submissions, repairs and enquiries.
- To contact you about your requests on your preferred channel.
- To keep business, tax and accounting records.
- To protect our website from abuse (for example rate limiting and spam filtering).

We do not sell your personal information and we do not send marketing messages unless you ask us to.

## Who we share it with (operators)

We use trusted service providers to run this website:

- **Supabase** — database, authentication and file storage.
- **Netlify** — website hosting.
- **An email provider** (if configured) — sending account and status emails.

These providers may store information on servers outside South Africa. Where this happens we rely on providers that are bound by data protection obligations, as required by section 72 of POPIA. *(Owner: confirm the Supabase region you selected and update this section.)*

## How long we keep it

We keep business records (such as completed sales, seller transactions and repair records) for as long as required for tax and legal purposes. If you ask us to delete your account, we remove or anonymise your personal details and keep only the minimum business record needed by law.

## Your rights

Under POPIA you may ask to access, correct or delete your personal information, and object to its processing. Signed-in customers can:

- **Download a copy of their data** from *My account → Privacy & data*.
- **Request account deletion** from the same page.

You can also contact us directly. If you're unhappy with how we've handled your information, you may complain to the [Information Regulator](https://inforegulator.org.za).

## Security

Access to your information is restricted by role-based permissions and database security rules. Only the owner can view customer requests and private notes. No system is perfectly secure, but we take reasonable measures to protect your information.

## Changes

We may update this policy. The latest version is always on this page.`,
  },

  terms: {
    slug: "terms",
    title: "Terms and conditions",
    description: "Terms and conditions for using the Guitarz4U website and requesting purchases, reservations, sales and repairs.",
    draftLegal: true,
    body: `> DRAFT — these terms must be reviewed by a qualified person before launch, including requirements under the Electronic Communications and Transactions Act (ECTA) and the Consumer Protection Act (CPA).

## About these terms

These terms apply when you use the Guitarz4U website. By creating an account or submitting a request you agree to them. Nothing in these terms limits rights you have under South African consumer law.

## No online payments

Guitarz4U does not process online payments. This website only lets you submit **requests**. If your purchase request is approved, payment will be arranged privately by EFT with the owner. Please wait for confirmation before making payment. Your order is not confirmed until Guitarz4U has approved it and confirmed the arrangements.

The "estimated total" shown when you submit a request is not an invoice and not a request for payment.

## Listings and prices

- Prices are in South African rand (ZAR).
- We describe each instrument honestly, but second-hand items may show wear. Please read the condition and defects before requesting a purchase.
- Listings may change or be withdrawn at any time. A guitar shown as available may have sold in the meantime; we confirm availability when we review your request.

## Purchase requests and reservations

- A purchase request or reservation request is an invitation for us to consider your request, not a binding sale.
- We may decline any request.
- A sale is confirmed only when we've approved it, you've paid by EFT and we've confirmed receipt of your payment.

## Selling your guitar

- Submitting a guitar does not oblige us to buy it, and does not oblige you to sell.
- Any offer we make is personal to the guitar submitted and may be withdrawn before it's accepted.
- You confirm that you own the guitar and are entitled to sell it. We don't buy loose parts on their own.

## Repairs

- Repair bookings are requests only. We assess every job and provide a quote; no work starts until it has been approved.
- Repair estimates may change if hidden problems are found; we'll contact you before doing extra work.

## Reviews

Reviews must be honest and relate to your own experience. We moderate all reviews before they're published and may decline or remove inappropriate content.

## Accounts

Keep your password safe. You're responsible for activity on your account. You can request deletion of your account at any time.

## Contact

Guitarz4U, Sandringham, Johannesburg, Gauteng. Email: Joshuaweinfas@gmail.com. WhatsApp: 064 856 7019.`,
  },
};

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Can I pay online?",
    a: "No. Guitarz4U does not process online payments. You submit a purchase request, we review it and contact you personally, and if it's approved we arrange payment privately by EFT. Please don't pay until we've confirmed your request.",
  },
  {
    q: "Is my purchase confirmed when I submit a request?",
    a: "No. A purchase request is not a confirmed sale. Your purchase is only confirmed once we've approved it, you've paid by EFT, and we've confirmed receipt of your payment.",
  },
  {
    q: "Where do I collect my guitar?",
    a: "We're based in Sandringham, Johannesburg. For privacy and safety we share the exact collection address only after your purchase has been approved and collection has been arranged.",
  },
  {
    q: "Do you deliver?",
    a: "Collection is our standard arrangement. If you need another option, ask us when we contact you about your request.",
  },
  {
    q: "What do the condition ratings mean?",
    a: "We use Mint, Excellent, Very good, Good, Fair and Project / needs repair. Every listing also lists known defects. See our [policies](/policies) for full definitions.",
  },
  {
    q: "Can I reserve a guitar?",
    a: "Yes — use 'Request reservation' on the product page. Reservations must be approved by us, last for a limited hold period and then expire.",
  },
  {
    q: "Do you buy broken or incomplete guitars?",
    a: "Yes. We're interested in working, broken and incomplete electric, bass, acoustic and classical guitars. We don't buy loose guitar parts on their own.",
  },
  {
    q: "How do I sell my guitar to you?",
    a: "Fill in the [sell your guitar form](/sell) with photographs, or send the details on WhatsApp. We review every submission personally and may make you an offer.",
  },
  {
    q: "How much do repairs cost?",
    a: "Every repair is different, so we assess each guitar and give you a quote before any work starts. Nothing is done without your approval.",
  },
  {
    q: "What are your business hours?",
    a: "We're closed on Saturdays. For everything else, send us a WhatsApp or email and we'll get back to you.",
  },
  {
    q: "Why do I need an account?",
    a: "An account lets you track your purchase requests, reservations, seller submissions and repairs, and keeps your information private to you. Browsing, the request cart and the contact form don't need an account.",
  },
  {
    q: "How do you protect my information?",
    a: "Only the owner can see your requests. We never collect card or banking details. You can download or request deletion of your data from your account. See our [privacy policy](/privacy).",
  },
];

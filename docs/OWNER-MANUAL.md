# Owner manual — running Guitarz4U without coding

Step-by-step basics are in **BEGINNER-GUIDE.md → Phase I**. This page adds detail and good habits.

## Daily routine (5–10 minutes)

1. Open **Admin** → **Overview**. The "Needs attention" tiles show new enquiries, offers, messages, reservations ending within 12 hours, seller submissions, repair requests and reviews to moderate. Orange tiles have something waiting.
2. Reply by WhatsApp or email using the buttons on each record. **WhatsApp buttons only open WhatsApp with a message ready — you must press Send.** The website cannot tell whether a WhatsApp message was delivered.
3. Update statuses as things happen so customers see progress in their accounts.

## Products

- **Draft → Publish.** New listings are hidden drafts. Publishing requires at least one honest description that you have approved (tick box). Photos are strongly recommended — the website warns if there are none.
- **Featured** guitars appear in the homepage hero. **New arrival** adds a badge.
- **Public serial number** is only shown if you fill in that field. The private serial, what you paid and notes are never shown.
- **Never use stock photos** or photos of a different guitar. Upload only real photos of the item.
- **Unpublish** hides a guitar (back to draft). **Archive** hides it permanently but keeps the record. **Restore** brings it back. **Delete draft** only works for drafts.
- When a guitar is first published, customers with a matching **Notify me** alert are emailed automatically (up to 150 per listing).

## Reservations

- Customers must be signed in to reserve. Each customer can hold up to 2 at a time (Settings).
- Default length: 48 hours (Settings → Reservation length). Expiry is automatic.
- **Extend**, **Cancel** or **Complete sale (mark sold)** from Admin → Reservations. "Reserve manually" on a product page holds a guitar for someone who contacted you directly.
- A reservation is not a payment. Only mark sold when you are satisfied the sale is complete.

## Purchase enquiries and offers

- Enquiries come from the enquiry cart. Status: New → Contacted → Sale agreed → Completed (or Cancelled).
- Offers are never accepted automatically. Record a counter-offer amount, then set Accepted/Declined. The customer gets an email if "Notify" is ticked.

## Seller enquiries (people selling or giving away guitars)

1. Review the details and private photos.
2. Arrange an inspection; record the date and findings.
3. **Only make an offer after inspecting in person.** Record it — the seller can be emailed automatically.
4. Record counter-offers and the final accepted/declined decision.
5. Arrange handover privately (record notes — private), then mark Completed.
6. If you are buying the guitar to resell, use **Create a shop listing for this guitar**.
7. Consider the legal obligations for second-hand dealers (ask a professional) — e.g. record the seller's identity where required.

## Repairs

- No work may start until the customer approves the quote — the system blocks it.
- Quotes show labour and parts separately. Registered customers approve in their account; for others, record their decision with **how** they gave it (WhatsApp/email/phone/in person) and a short evidence note, e.g. "WhatsApp 6 Nov 10:15: 'yes go ahead'".
- Extra work = **additional-cost quote**. Completion is blocked until the customer decides.
- Work log entries can be private or shown to the customer.
- When marked **Repair completed**, the current warranty period is saved with the repair.

## Payments

- Record a payment **only after checking your bank account** (or counting cash). Never because of a screenshot — fake proof-of-payment is a common scam.
- Wrong entry? **Void** it with a reason. Voided payments stay in the history.
- Reports count only recorded payments as revenue.

## Reviews

Approve genuine reviews (good or bad). Reject spam, abuse or reviews containing personal details. Never write reviews yourself or edit customers' words.

## Website text, FAQs and policies

- Admin → **Website content**: About, How it works, intro texts and all legal policies. Text uses Markdown: `## Heading`, `**bold**`, `- bullet`.
- Tokens are filled automatically from Settings: `{{whatsapp}}`, `{{contact_email}}`, `{{collection_area}}`, `{{reservation_hours}}`, `{{warranty}}`, `{{warranty_terms}}`, `{{business_name}}`.
- Legal policies show a **Draft** banner until you tick "This policy has been reviewed and approved".

## Staff

Admin → **Customers & staff** → open the person (they must register first) → Role **Staff** → tick only the permissions they need → Save. Owner access gives everything — only give it to someone you fully trust. Block an account instantly with "Block this account". All changes are in the **Audit log**.

## Settings

Contact details, owner notification email, reservation length and limit, **repair warranty period** (leave empty until decided), warranty terms, notice bar, and legal-review confirmation. Secret keys are **not** here — they live in Netlify.

## Notifications and email

Admin → **Notifications**: everything that happened, plus the **Email log** (sent / failed / skipped) with a **Retry** button and **Send a test email**.

## Reports

Admin → **Reports & analytics**: recorded revenue (sales and repairs), quotes approved (not revenue), enquiries, reservations and conversion, seller submissions, repairs, inventory, and visit counts (only visitors who allowed analytics are counted).

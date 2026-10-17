# Architecture & key workflows

## Overview

A single Next.js 15 application (server-rendered React + server actions + route handlers) backed by PostgreSQL. Business rules live in `src/lib/**` and are independent of the UI, so they are unit/integration tested directly. UI files call these functions through server actions (`src/app/actions/**`) or route handlers (`src/app/api/**`).

Money is stored as integer **cents (ZAR)** everywhere. Times are stored in UTC and displayed in `Africa/Johannesburg`.

## Roles & permissions

Roles: `ADMIN` (owner), `CONTENT_MANAGER`, `CUSTOMER`. The permission matrix is in `src/lib/permissions.ts`, kept in code on purpose so it can't be changed by editing database rows. Every admin page calls `requirePermissionPage()`, and every admin action or API calls `requirePermission()`. Hidden buttons are never relied on.

| Area | Owner | Content manager | Customer |
| --- | :-: | :-: | :-: |
| Dashboard (non-financial) | ✓ | ✓ | – |
| Financial figures, reports, CSV exports | ✓ | – | – |
| Product descriptions, specs, photos | ✓ | ✓ | – |
| Prices, costs, stock, publish/sold status | ✓ | – | – |
| Orders, refunds, repairs, purchase enquiries | ✓ | – | – |
| Answer product questions | ✓ | ✓ (needs owner approval to publish) | – |
| Publish reviews / questions | ✓ | – | – |
| Pages, FAQs, homepage banner | ✓ publish | ✓ draft → owner approves | – |
| Customers, roles, suspensions, deletion requests | ✓ | – | – |
| Discounts, newsletter, settings, audit log | ✓ | – | – |

## Unique-item stock & checkout (`src/lib/shop`)

1. Cart lines hold only product IDs and quantities. Prices always come from the database.
2. `createOrderFromCart()` runs in one transaction. It locks the product rows (`SELECT … FOR UPDATE`, in a fixed order to avoid deadlocks), checks `quantity − live reservations`, creates the order, its items, a **20-minute `StockReservation`** and a pending `Payment` with a unique reference.
3. A second customer trying to buy the same guitar at the same moment waits on the row lock, then sees it reserved. Tested with 4 simultaneous buyers: exactly one succeeds.
4. Reservations expire lazily (on every checkout) and through `/api/cron/maintenance`. Cancelling at PayFast or a FAILED notification releases them immediately.
5. Selected parts can have stock quantities above 1 (with low-stock alerts). Guitars are always quantity 1.

## Payments (`src/lib/payfast.ts`, `src/lib/shop/payments.ts`)

```
Customer → /checkout/pay/:id (server builds signed, card-only PayFast form) → PayFast
PayFast  → POST /api/payments/payfast/notify (ITN)
            1. verify MD5 signature (with passphrase) and merchant id
            2. POST back to PayFast /eng/query/validate → must answer "VALID"
            3. insert PaymentEvent (unique key = pf_payment_id + status) → duplicates ignored
            4. transaction: lock Payment row; check amount_gross == expected amount;
               ORDER  → fulfilOrder(): convert reservation, decrement stock, mark SOLD, order PAID
               REPAIR → RepairPayment; repair PAID when quote total is covered
Browser  → /checkout/return polls the order status; it never marks anything paid itself
```

Edge cases handled: duplicate and concurrent notifications, amount mismatch (flagged, not paid), failed or cancelled payments (stock released), and **late payments**. If the reservation expired but the item is still free, the order completes. If someone else bought it meanwhile, the order goes to *Refund pending* with an approved refund decision and an owner alert. It is never double-sold, and never shown as refunded until a gateway reference is recorded.

## Order statuses

`AWAITING_PAYMENT → PAID → COLLECTION_PENDING → READY_FOR_COLLECTION → COLLECTED`, plus `PAYMENT_PROCESSING`, `PAYMENT_FAILED`, `EXPIRED`, `CANCELLATION_REQUESTED`, `CANCELLED`, `REFUND_PENDING`, `REFUNDED`. Staff transitions are whitelisted in `src/lib/shop/order-status.ts`. Staff can never set `PAID` by hand. `REFUNDED` is only set when completed, gateway-referenced refunds cover the payment.

## Repairs (`src/lib/repairs`)

`SUBMITTED → AWAITING_REVIEW → ACCEPTED_FOR_ASSESSMENT → AWAITING_ASSESSMENT → QUOTE_PREPARED → AWAITING_CUSTOMER_APPROVAL → QUOTE_ACCEPTED → IN_PROGRESS (⇄ AWAITING_PARTS) → COMPLETED → PAYMENT_DUE → PAID → READY_FOR_COLLECTION → COLLECTED`, with `DECLINED` (reason required) and `CANCELLED`.

- Quotes are versioned, with labour and part lines, the owner's private cost per line, warranty days and terms, exclusions and validity. A draft is only sent once the owner ticks "I have inspected the instrument and approve this quote".
- The customer accepts online (with an explicit terms checkbox, timestamp and IP), or the owner records an offline acceptance with a mandatory note.
- **Hard rules (even with an owner override):** no work statuses without an accepted quote, and `PAID` only once payments cover the quote total. Overrides need a reason, and every change is written to `RepairStatusHistory` and the audit log.
- Completing a job automatically raises *Payment due* and starts the warranty record. Repair payments (online card via PayFast, or recorded cash/EFT/card-in-person) are separate from shop orders.

## Purchase enquiries (`src/lib/enquiries`)

Submitted → under review → more info requested → offer made ⇄ counter-offer received → offer accepted → purchase completed → converted to inventory (creates a **hidden DRAFT** product with the purchase price as acquisition cost). Declined and withdrawn are terminal. Every step is stored in `EnquiryEvent`, and every offer and counter-offer in `PurchaseOffer`. The accepted item types are set by the owner in *Admin → Settings*.

## Content

Pages and policies are stored in the `Page` table (defaults in `prisma/content/*.md`) and rendered with a small, safe Markdown renderer that outputs React elements only, never raw HTML. Content-manager edits are saved as drafts for the owner to approve. `[OWNER TO CONFIRM …]` and `[LEGAL REVIEW …]` markers are highlighted on the page so open decisions stay visible.

## Database

See `prisma/schema.prisma` (35 models). The second migration adds CHECK constraints (non-negative money, totals that add up, ratings 1–5, completed refunds must have a gateway reference) and partial unique indexes (one live reservation per order and item, one outstanding quote per repair, case-insensitive unique emails and discount codes).

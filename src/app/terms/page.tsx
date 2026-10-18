import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { PageHead, EftNotice } from "@/components/ui";
import { DraftBanner } from "@/components/DraftBanner";

export const metadata: Metadata = { title: "Terms and conditions", description: "Terms for using the Guitarz4U website, purchase requests, private EFT payment, reservations, guitar submissions and repairs.", alternates: { canonical: "/terms" } };
export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <>
      <PageHead title="Terms and conditions" crumbs={[{ label: "Terms" }]} />
      <div className="wrap section-tight prose">
        <DraftBanner />
        <p>Last updated: October 2026. These terms apply to your use of the Guitarz4U website. By using the site you agree to them.</p>
        <h2>1. Purchase requests are not orders</h2>
        <p>Submitting a purchase request does not create a sale or a binding agreement. A sale is only agreed once Guitarz4U has approved your request and confirmed the price, payment and collection arrangements with you personally.</p>
        <EftNotice />
        <h2>2. Prices and availability</h2>
        <p>Prices are shown in South African rand (ZAR). Each guitar is a single second-hand item, so availability can change at any time. The estimated total in the request cart is for information only and is not an invoice. We may correct obvious pricing errors before approving a request.</p>
        <h2>3. Payment</h2>
        <p>Payment is made only by EFT, using banking details that Guitarz4U shares with you privately after approval. Never pay before we confirm your request. A payment is only regarded as received once Guitarz4U has verified that the funds have reflected in its bank account. Guitarz4U will never ask for your card details, online banking password or one-time PINs.</p>
        <h2>4. Second-hand condition</h2>
        <p>All instruments are pre-owned and may show signs of wear. We describe condition and known defects as accurately as we can. Please read the listing carefully and ask questions or inspect the guitar before paying. See our <Link href="/policies">returns, cancellations and condition policy</Link>.</p>
        <h2>5. Reservations</h2>
        <p>Reservations are only confirmed when approved by Guitarz4U and are held for the period we confirm with you. Unapproved or expired reservations do not hold the item.</p>
        <h2>6. Selling to Guitarz4U</h2>
        <p>Submitting your guitar is an invitation for us to consider it, not an offer by us to buy. Any offer we make is subject to inspection of the guitar. You confirm that you own the guitar you submit and are entitled to sell it. We do not buy loose parts on their own.</p>
        <h2>7. Repairs</h2>
        <p>Repair bookings are requests. No work starts until you have approved our quote. Quotes are estimates based on the information available; if we find additional problems we will contact you before doing extra work. Please collect repaired guitars promptly once we notify you.</p>
        <h2>8. Accounts and reviews</h2>
        <p>Keep your password secure. Reviews must be honest and about your own experience; we moderate reviews before publishing and may decline or remove reviews that are abusive, misleading or unrelated.</p>
        <h2>9. Collection</h2>
        <p>The collection address is shared privately after approval. Risk in the guitar passes to you on collection.</p>
        <h2>10. Your statutory rights</h2>
        <p>Nothing in these terms limits rights you have under the Consumer Protection Act, 68 of 2008, or other South African law.</p>
        <h2>11. Contact</h2>
        <p>{s.email} · WhatsApp {s.whatsappNumber} · {s.locationLine}</p>
      </div>
    </>
  );
}

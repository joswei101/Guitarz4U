import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, EftNotice } from "@/components/ui";

export const metadata: Metadata = {
  title: "How buying and selling works",
  description: "The Guitarz4U process: purchase requests, personal confirmation, private EFT payment, reservations, collection in Johannesburg, selling your guitar and repair bookings.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHead title="How buying and selling works" eyebrow="Our process" intro="Simple, personal and transparent — with no online payments." crumbs={[{ label: "How it works" }]} />
      <div className="wrap section-tight">
        <div className="detail-grid">
          <div className="stack">
            <section className="card" id="buying">
              <h2>Buying a guitar</h2>
              <ol className="steps">
                <li>Browse the shop and read each guitar&apos;s condition and disclosed defects.</li>
                <li>Add the guitars you want to your <strong>request cart</strong>.</li>
                <li>Submit a <strong>purchase request</strong> with your contact details and an optional message. No payment is taken.</li>
                <li>Guitarz4U reviews your request personally and checks that the guitars are still available.</li>
                <li>We contact you on WhatsApp or email (your choice) to confirm the final price and collection arrangements.</li>
                <li>If approved, we share our EFT details with you <strong>privately</strong>.</li>
                <li>You make the EFT from your own banking app.</li>
                <li>We verify that the funds have reflected in our own bank account, then update your request to “Payment confirmed”.</li>
                <li>We privately confirm the collection address and time with you, and you collect your guitar.</li>
              </ol>
              <div style={{ marginTop: 16 }}><EftNotice /></div>
            </section>
            <section className="card" id="statuses">
              <h2>Purchase request statuses</h2>
              <dl className="kv">
                <dt>Request submitted</dt><dd>We have received your request. Nothing is confirmed yet.</dd>
                <dt>Under review</dt><dd>We are checking availability.</dd>
                <dt>Awaiting customer response</dt><dd>We have contacted you and are waiting for your reply.</dd>
                <dt>Purchase approved</dt><dd>We have approved your purchase; the guitar is held for you.</dd>
                <dt>Awaiting private EFT payment</dt><dd>EFT details have been shared privately with you.</dd>
                <dt>Payment confirmed by administrator</dt><dd>We have personally checked that your EFT reflected.</dd>
                <dt>Ready for collection</dt><dd>Collection details have been confirmed privately.</dd>
                <dt>Completed</dt><dd>You have your guitar. Enjoy!</dd>
                <dt>Declined / Cancelled</dt><dd>The request will not go ahead. No payment should be made.</dd>
              </dl>
            </section>
            <section className="card" id="reservations">
              <h2>Reservations</h2>
              <p>You can request a reservation on any available guitar. A reservation is <strong>not</strong> confirmed until we approve it. Approved reservations are held for a limited period (normally a few days) and then expire if the sale has not been arranged. See our <Link href="/policies#reservations">reservation policy</Link>.</p>
            </section>
          </div>
          <div className="stack">
            <section className="card" id="selling">
              <h2>Selling your guitar</h2>
              <ol className="steps">
                <li>Submit your guitar&apos;s details and photos on the <Link href="/sell">Sell page</Link> or on WhatsApp.</li>
                <li>We review it personally and may ask for more information.</li>
                <li>If we are interested, we make you a personal offer.</li>
                <li>You accept or decline. Accepting is not a final sale until we have inspected the guitar.</li>
                <li>We arrange inspection and payment with you directly.</li>
              </ol>
              <p className="small muted" style={{ marginTop: 12 }}>We buy working, broken and incomplete guitars — but not loose parts on their own.</p>
            </section>
            <section className="card" id="repairs">
              <h2>Repairs</h2>
              <ol className="steps">
                <li>Book online with a description and photos.</li>
                <li>We assess the work and send a quote.</li>
                <li>You approve the quote; we confirm a date.</li>
                <li>We let you know when it is ready for collection.</li>
              </ol>
            </section>
            <section className="card" id="collection">
              <h2>Collection</h2>
              <p>Collections are in Sandringham, Johannesburg. The exact address is shared privately only after your purchase or repair has been approved. We are closed on Saturdays.</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

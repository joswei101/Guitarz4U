import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { PageHead } from "@/components/ui";
import { DraftBanner } from "@/components/DraftBanner";

export const metadata: Metadata = { title: "Privacy policy (POPIA)", description: "How Guitarz4U collects, uses and protects your personal information under South Africa's Protection of Personal Information Act (POPIA).", alternates: { canonical: "/privacy" } };
export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <>
      <PageHead title="Privacy policy" eyebrow="POPIA" crumbs={[{ label: "Privacy policy" }]} />
      <div className="wrap section-tight prose">
        <DraftBanner />
        <p>Last updated: October 2026</p>
        <h2>1. Who we are</h2>
        <p>Guitarz4U (“we”, “us”) is a second-hand guitar business based in {s.locationLine}, South Africa. We are the responsible party for the personal information collected through this website. You can contact our information officer at <a href={`mailto:${s.email}`}>{s.email}</a> or on WhatsApp {s.whatsappNumber}.</p>
        <h2>2. What we collect</h2>
        <ul>
          <li><strong>Account details:</strong> name, email address, password (stored only as a secure one-way hash), and optionally your phone number and preferred contact method.</li>
          <li><strong>Request details:</strong> information you give us in purchase requests, reservation requests, guitar submissions, repair bookings, product questions and contact messages, including photos you upload.</li>
          <li><strong>Reviews:</strong> your rating, review text and the display name you choose.</li>
          <li><strong>Technical data:</strong> a login session cookie (only if you log in), and an IP address that is kept with your login session for security. Our page-view statistics do not use cookies and do not store IP addresses or identify you.</li>
        </ul>
        <p>We do <strong>not</strong> collect card details, online banking passwords or any payment credentials. We never take payments on this website.</p>
        <h2>3. Why we use it</h2>
        <ul>
          <li>To respond to your requests and contact you using the method you choose.</li>
          <li>To arrange purchases, reservations, collections, offers for your guitar and repairs.</li>
          <li>To keep business records required for accounting, tax and dispute purposes.</li>
          <li>To keep the website secure and prevent abuse.</li>
        </ul>
        <p>We do not sell your personal information and we do not send marketing messages unless you ask us to.</p>
        <h2>4. Photos</h2>
        <p>Photos you upload for guitar submissions and repairs are stored privately and shown only to you (when logged in) and to Guitarz4U. Location data (GPS) and other hidden metadata are removed from photos when they are uploaded.</p>
        <h2>5. Where your information is stored (operators)</h2>
        <p>We use third-party service providers (“operators”) to run the website: website hosting, a database and file storage provider, and (if enabled) an email delivery service. Some of these providers store data on servers outside South Africa. We choose providers that protect personal information to a standard comparable to POPIA. <em>[Owner: list your actual providers and their data regions here before launch — see docs/FREE-SERVICES.md.]</em></p>
        <h2>6. How long we keep it</h2>
        <p>We keep request and transaction records for as long as needed for the purpose they were collected and for legal record-keeping (generally up to five years for completed sales). Unsuccessful submissions and messages are deleted or anonymised when no longer needed. You can ask us to delete your information earlier — see below.</p>
        <h2>7. Your rights</h2>
        <p>Under POPIA you may ask to access the personal information we hold about you, ask us to correct or delete it, and object to its processing. If you have an account, you can request a copy of your data or the deletion of your account under <Link href="/account/privacy">Account → Privacy &amp; data</Link>. Otherwise contact us at {s.email}.</p>
        <p>When an account is deleted we remove your login and personal profile details. Records of completed sales may be kept in anonymised form where we must keep them by law.</p>
        <p>If you are unhappy with how we handle your information, you may lodge a complaint with the Information Regulator of South Africa (<a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer">inforegulator.org.za</a>).</p>
        <h2>8. Security</h2>
        <p>We use encrypted connections (HTTPS), hashed passwords, access controls that limit private information to you and Guitarz4U, and an audit log of administrative actions. No system is perfectly secure, and we will notify you and the Information Regulator if a security compromise affects your information, as POPIA requires.</p>
        <h2>9. Browser storage</h2>
        <p>Your request cart and “recently viewed” list are saved only in your own browser (local storage) and are not sent to us until you submit a request.</p>
        <h2>10. Changes</h2>
        <p>We may update this policy. The latest version will always be on this page.</p>
      </div>
    </>
  );
}

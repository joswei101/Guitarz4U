import type { Metadata } from "next";
import { Fragment } from "react";
import { getSettings } from "@/lib/settings";
import { CONDITIONS } from "@/lib/format";
import { PageHead } from "@/components/ui";
import { DraftBanner } from "@/components/DraftBanner";

export const metadata: Metadata = { title: "Returns, cancellations, condition & reservation policies", description: "Guitarz4U policies for returns, cancellations, second-hand condition ratings and reservations.", alternates: { canonical: "/policies" } };
export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  const s = await getSettings();
  return (
    <>
      <PageHead title="Returns, cancellations & reservations" eyebrow="Policies" crumbs={[{ label: "Policies" }]} />
      <div className="wrap section-tight prose">
        <DraftBanner />
        <h2 id="condition">Second-hand condition</h2>
        <p>Every instrument we sell is pre-owned. We rate condition using the scale below and list every known defect on the guitar&apos;s page. Photos form part of the description.</p>
        <dl className="kv">
          {Object.values(CONDITIONS).map((c) => (<Fragment key={c.label}><dt>{c.label}</dt><dd>{c.help}</dd></Fragment>))}
        </dl>
        <p>Guitars listed as “Needs repair” are sold as project instruments, and may be incomplete or not working.</p>
        <h2 id="cancellations">Cancelling a purchase request</h2>
        <p>You may cancel a purchase request at any time before payment, from your account or by contacting us. Please do not make an EFT until we have approved your request. If you need to cancel after paying, contact us immediately and we will discuss a refund of the amount paid, less any costs we have agreed with you in advance.</p>
        <h2 id="returns">Returns</h2>
        <p>We encourage you to inspect and play the guitar at collection before accepting it. If a guitar has a material defect that was not disclosed in the listing, contact us within 7 days of collection and we will work with you on a repair, replacement or refund, in line with the Consumer Protection Act. Wear and defects that were disclosed in the listing are not grounds for a return. <em>[Owner: confirm the return period and conditions you are comfortable with.]</em></p>
        <h2 id="reservations">Reservations</h2>
        <ul>
          <li>A reservation request is not confirmed until Guitarz4U approves it.</li>
          <li>Approved reservations are normally held for {s.reservationDays} days unless we agree otherwise with you. The exact expiry is shown in your account.</li>
          <li>Only one reservation can be approved for a guitar at a time.</li>
          <li>If the sale is not arranged before the reservation expires, the guitar may be released back to the shop.</li>
          <li>You can cancel a reservation at any time.</li>
        </ul>
        <h2 id="collection">Collection</h2>
        <p>Collection arrangements, including the address, are shared privately once your purchase has been approved and payment confirmed. {s.hoursNotice}</p>
      </div>
    </>
  );
}

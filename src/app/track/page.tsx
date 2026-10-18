import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/ui";
import { TrackClient } from "./TrackClient";

export const metadata: Metadata = {
  title: "Track a request, submission or repair",
  description: "Check the status of your Guitarz4U purchase request, reservation, guitar submission or repair booking.",
  robots: { index: false },
};

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <>
      <PageHead
        title="Track your request"
        eyebrow="Status updates"
        intro="Purchase requests, reservations, guitar submissions and repair bookings can all be tracked here with your reference number."
        crumbs={[{ label: "Track a request" }]}
      />
      <div className="wrap section-tight narrow">
        <TrackClient initialRef={typeof ref === "string" ? ref.slice(0, 20) : ""} />
        <p className="small muted" style={{ marginTop: 20 }}>
          Have an account? <Link href="/account">Your account</Link> shows all your requests, and lets you respond to offers and repair quotes.
        </p>
      </div>
    </>
  );
}

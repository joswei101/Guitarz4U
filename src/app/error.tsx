"use client";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="wrap section center" style={{ maxWidth: 620 }}>
      <h1>Something went wrong</h1>
      <p className="lead" style={{ margin: "0 auto 24px" }}>Sorry — we could not load this page. Please try again. If the problem continues, contact us on WhatsApp.</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <button className="btn btn-primary" onClick={() => reset()}>Try again</button>
        <Link href="/" className="btn btn-outline">Home</Link>
      </div>
    </div>
  );
}

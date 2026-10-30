'use client';
import Link from 'next/link';

// Friendly error page. Technical details are never shown to visitors.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="section">
      <div className="wrap narrow" style={{ textAlign: 'center' }}>
        <h1>Something went wrong</h1>
        <p className="muted">Sorry — we couldn&apos;t load this page. Please try again. If it keeps happening, contact us on WhatsApp: 064 856 7019.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-primary" onClick={() => reset()}>Try again</button>
          <Link href="/" className="btn btn-outline">Go home</Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="container-page flex flex-1 flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-2 text-4xl">We hit a wrong note</h1>
      <p className="mt-4 max-w-md text-ink-soft">
        Sorry — something went wrong loading this page. Please try again. If the problem continues, contact us on WhatsApp.
      </p>
      <div className="mt-8 flex gap-3">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Try again
        </button>
        <Link href="/" className="btn btn-outline">
          Go home
        </Link>
      </div>
    </main>
  );
}

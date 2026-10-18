"use client";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-16">
      <div className="max-w-lg text-center">
        <h1 className="text-3xl">Something went wrong</h1>
        <p className="mt-3 text-walnut/80">
          Sorry — we couldn&apos;t load this page. Please try again. If it keeps happening, contact us on WhatsApp.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            Try again
          </button>
          <Link href="/" className="btn btn-outline">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

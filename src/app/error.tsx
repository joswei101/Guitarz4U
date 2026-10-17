"use client";

import { Button, ButtonLink } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container py-24 text-center">
      <h1 className="font-display text-4xl uppercase text-bone">Something went wrong</h1>
      <p className="mx-auto mt-3 max-w-md text-bone-muted">We hit an unexpected problem loading this page. Please try again. If it keeps happening, contact us on WhatsApp.</p>
      {error.digest && <p className="mt-2 text-xs text-bone-dim">Reference: {error.digest}</p>}
      <div className="mt-8 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="outline">Go home</ButtonLink>
      </div>
    </div>
  );
}

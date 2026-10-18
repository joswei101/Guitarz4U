"use client";
import { useState } from "react";
import { Field, FormStatus, SpamTrap, inputProps, useSubmit } from "@/components/forms";
import { StatusBadge } from "@/components/ui";
import { formatRand } from "@/lib/format";
import type { PublicStatusView } from "@/lib/lookup";

export function TrackClient({ initialRef }: { initialRef: string }) {
  const { pending, error, fieldErrors: fe, submit } = useSubmit<{ result: PublicStatusView }>("/api/track-lookup");
  const [result, setResult] = useState<PublicStatusView | null>(null);
  const fmt = (d: string) => new Date(d).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });

  return (
    <div className="stack">
      <form
        className="card form"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await submit(new FormData(e.currentTarget));
          setResult(res ? res.result : null);
        }}
      >
        <FormStatus error={error} />
        <div className="form-grid">
          <Field label="Reference number" name="reference" required error={fe.reference} hint="e.g. G4U-PR-7KQ2MX9A">
            <input type="text" {...inputProps("reference", fe, true)} required defaultValue={initialRef} autoCapitalize="characters" maxLength={20} />
          </Field>
          <Field label="Email or phone number used" name="contact" required error={fe.contact}>
            <input type="text" {...inputProps("contact", fe)} required maxLength={200} autoComplete="email" />
          </Field>
        </div>
        <SpamTrap />
        <button className="btn btn-primary" disabled={pending}>{pending ? "Checking…" : "Check status"}</button>
      </form>

      {result && (
        <section className="card stack" aria-live="polite" data-testid="track-result">
          <div className="row between">
            <h2 style={{ margin: 0 }}>{result.kindLabel} {result.reference}</h2>
            <StatusBadge status={result.status} label={result.statusLabel} />
          </div>
          <ul>{result.summary.map((s, i) => <li key={i}>{s}</li>)}</ul>
          {result.customerUpdate && (
            <div className="notice"><strong>Latest message from Guitarz4U</strong><p className="pre-line">{result.customerUpdate}</p></div>
          )}
          {result.offer && (
            <div className="notice notice-info">
              <strong>Offer: {formatRand(result.offer.amountCents)} ({result.offer.status})</strong>
              {result.offer.message && <p className="pre-line">{result.offer.message}</p>}
              {result.offer.status === "pending" && <p>To accept or decline, log in to your account (using the same email address) or reply to us on WhatsApp.</p>}
            </div>
          )}
          {result.quote && (
            <div className="notice notice-info">
              <strong>Repair quote: {result.quote.amountCents !== null ? formatRand(result.quote.amountCents) : "see message"}</strong>
              {result.quote.message && <p className="pre-line">{result.quote.message}</p>}
              <p>{result.quote.response ? `You ${result.quote.response} this quote.` : "To accept or decline, log in to your account or reply on WhatsApp. No work starts without your approval."}</p>
            </div>
          )}
          {result.confirmedDate && <p><strong>Confirmed date:</strong> {new Date(result.confirmedDate).toLocaleDateString("en-ZA", { dateStyle: "long" })}</p>}
          <h3>History</h3>
          <ol className="timeline">
            {result.timeline.map((t, i) => (
              <li key={i}>
                <time dateTime={t.at}>{fmt(t.at)}</time>
                <strong>{t.label}</strong>
                {t.note && <p className="pre-line" style={{ margin: "4px 0 0" }}>{t.note}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

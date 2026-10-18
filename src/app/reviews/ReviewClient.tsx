"use client";
import { useState } from "react";
import { Field, FormStatus, SpamTrap, inputProps, useSubmit } from "@/components/forms";

export function ReviewForm({ defaultName }: { defaultName: string }) {
  const { pending, error, fieldErrors: fe, submit } = useSubmit("/api/reviews");
  const [done, setDone] = useState(false);
  if (done)
    return (
      <div className="card" role="status" data-testid="review-success">
        <h2 style={{ fontSize: "1.3rem" }}>Thank you!</h2>
        <p>Your review has been received and will appear once it has been approved.</p>
      </div>
    );
  return (
    <form className="card form" onSubmit={async (e) => { e.preventDefault(); if (await submit(new FormData(e.currentTarget))) setDone(true); }}>
      <h2 style={{ fontSize: "1.3rem", marginBottom: 0 }}>Write a review</h2>
      <FormStatus error={error} />
      <fieldset>
        <legend className="label">Your rating</legend>
        <div className="row">
          {[5, 4, 3, 2, 1].map((n) => (
            <label key={n} className="check"><input type="radio" name="rating" value={n} required defaultChecked={n === 5} /> {n} ★</label>
          ))}
        </div>
      </fieldset>
      <Field label="Title (optional)" name="title" error={fe.title}>
        <input type="text" {...inputProps("title", fe)} maxLength={120} />
      </Field>
      <Field label="Your review" name="body" required error={fe.body}>
        <textarea {...inputProps("body", fe)} required minLength={10} maxLength={2000} rows={5} />
      </Field>
      <Field label="Name to show" name="displayName" required error={fe.displayName} hint="e.g. your first name">
        <input type="text" {...inputProps("displayName", fe, true)} required maxLength={60} defaultValue={defaultName} />
      </Field>
      <SpamTrap />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Sending…" : "Submit review for approval"}</button>
    </form>
  );
}

export function ReportButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const { pending, error, submit } = useSubmit("/api/reviews/report");
  if (done) return <span className="small muted">Reported — thank you.</span>;
  if (!open) return <button className="link-btn small" onClick={() => setOpen(true)}>Report</button>;
  return (
    <form
      className="row"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("reviewId", reviewId);
        if (await submit(fd)) setDone(true);
      }}
    >
      <label className="sr-only" htmlFor={`reason-${reviewId}`}>Reason for reporting</label>
      <input id={`reason-${reviewId}`} name="reason" className="input" placeholder="What is wrong with this review?" required minLength={3} maxLength={1000} style={{ minWidth: 220 }} />
      <SpamTrap />
      <button className="btn btn-sm btn-outline" disabled={pending}>Send</button>
      {error && <span className="field-error">{error}</span>}
    </form>
  );
}

"use client";
import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { reportReview } from "@/app/actions/requests";

export function ReportReview({ reviewId, signedIn }: { reviewId: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (msg) return <p className="text-xs text-success" role="status">{msg}</p>;
  if (!open)
    return (
      <button type="button" className="inline-flex items-center gap-1 text-xs text-tan hover:underline" onClick={() => setOpen(true)}>
        <Flag className="h-3 w-3" aria-hidden /> Report
      </button>
    );
  if (!signedIn)
    return (
      <p className="text-xs">
        Please <a href="/login?next=/reviews" className="link">sign in</a> to report a review.
      </p>
    );
  return (
    <form
      className="mt-2 flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await reportReview(reviewId, reason);
          setMsg(r.ok ? r.message! : r.error);
        });
      }}
    >
      <label htmlFor={`rr-${reviewId}`} className="text-xs font-semibold">
        Why is this review inappropriate?
      </label>
      <input id={`rr-${reviewId}`} className="input !min-h-9 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} required minLength={5} />
      <div className="flex gap-2">
        <button className="btn btn-outline btn-sm" disabled={pending}>
          Send report
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

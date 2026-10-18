"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moderateReview, resolveReports } from "@/app/actions/admin";

export function ReviewModeration({ id, status, hasReports }: { id: string; status: string; hasReports: boolean }) {
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const go = (s: "approved" | "rejected" | "removed") =>
    start(async () => {
      const r = await moderateReview(id, s, reason);
      setMsg(r.ok ? r.message! : r.error);
      router.refresh();
    });
  return (
    <div className="mt-3 space-y-2">
      {status !== "approved" && status !== "removed" && (
        <>
          <label htmlFor={`rr-${id}`} className="sr-only">Reason (shown to reviewer if rejected)</label>
          <input id={`rr-${id}`} className="input !min-h-9 text-sm" placeholder="Reason if rejecting (shown to the reviewer)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {status !== "approved" && <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => go("approved")}>Approve &amp; publish</button>}
        {status === "pending" && <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => go("rejected")}>Reject</button>}
        {status === "approved" && <button type="button" className="btn btn-outline btn-sm text-danger" disabled={pending} onClick={() => confirm("Remove this published review?") && go("removed")}>Remove</button>}
        {hasReports && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => { const r = await resolveReports(id); setMsg(r.ok ? r.message! : r.error); router.refresh(); })}>
            Dismiss reports
          </button>
        )}
      </div>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}

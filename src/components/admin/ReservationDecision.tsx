"use client";
import { useFormAction } from "@/components/forms/useFormAction";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveReservation, declineReservation } from "@/app/actions/admin";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/forms/SubmitButton";

export function ReservationDecision({ id, status, holdDays, productAvailable }: { id: string; status: string; holdDays: number; productAvailable: boolean }) {
  const { state, onSubmit, pending: submitting } = useFormAction(approveReservation.bind(null, id));
  const [declineMsg, setDeclineMsg] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="space-y-5">
      {state && <Alert tone={state.ok ? "success" : "error"}>{state.ok ? state.message : state.error}</Alert>}
      {status === "requested" && (
        <form onSubmit={onSubmit} className="space-y-3">
          <h3 className="font-semibold">Approve</h3>
          {!productAvailable && <Alert tone="warning">The product is not currently available, so it cannot be reserved.</Alert>}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="hold" className="label">Hold for (days)</label>
              <input id="hold" name="hold_days" type="number" min={1} max={30} defaultValue={holdDays} className="input !w-28" />
            </div>
          </div>
          <div>
            <label htmlFor="appr-msg" className="label">Message to customer (optional)</label>
            <textarea id="appr-msg" name="customer_message" className="textarea !min-h-20" maxLength={2000} placeholder="Leave empty for an automatic message with the hold end date." />
          </div>
          <SubmitButton pending={submitting} pendingText="Approving…" disabled={!productAvailable}>Approve reservation</SubmitButton>
        </form>
      )}
      {["requested", "approved"].includes(status) && (
        <div className="space-y-2 border-t border-gold/30 pt-4">
          <h3 className="font-semibold">{status === "approved" ? "Release the hold" : "Decline"}</h3>
          <label htmlFor="dec-msg" className="sr-only">Message</label>
          <textarea id="dec-msg" className="textarea !min-h-20" value={declineMsg} onChange={(e) => setDeclineMsg(e.target.value)} placeholder="Optional message to the customer" maxLength={2000} />
          <button
            type="button"
            className="btn btn-outline text-danger"
            disabled={pending}
            onClick={() =>
              confirm(status === "approved" ? "Release this reservation? The item becomes available again." : "Decline this request?") &&
              start(async () => {
                const r = await declineReservation(id, declineMsg);
                setResult({ ok: r.ok, text: r.ok ? r.message! : r.error });
                router.refresh();
              })
            }
          >
            {status === "approved" ? "Release reservation" : "Decline request"}
          </button>
          {result && <p className={`text-sm ${result.ok ? "text-success" : "text-danger"}`}>{result.text}</p>}
        </div>
      )}
      {!["requested", "approved"].includes(status) && <p className="text-sm text-tan">This reservation is closed.</p>}
    </div>
  );
}

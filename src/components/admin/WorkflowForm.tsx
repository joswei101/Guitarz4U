"use client";
import { useFormAction } from "@/components/forms/useFormAction";
import { useRef } from "react";
import { Field, TextArea } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import type { ActionResult } from "@/lib/validation";

export function WorkflowForm({
  action,
  statuses,
  current,
  message,
  snippets = [],
  repair,
}: {
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  statuses: readonly { value: string; label: string }[];
  current: string;
  message: string | null;
  snippets?: { label: string; text: string }[];
  repair?: { quote_amount: number | null; quote_message: string | null; appointment_at: string | null };
}) {
  const { state, onSubmit, pending: submitting } = useFormAction(action);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const e = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const toLocal = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(new Date(iso).getTime() + 2 * 3600 * 1000); // SAST (UTC+2, no DST)
    return d.toISOString().slice(0, 16);
  };
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {state && <Alert tone={state.ok ? "success" : "error"}>{state.ok ? state.message : state.error}</Alert>}
      <div>
        <label htmlFor="wf-status" className="label">Status</label>
        <select id="wf-status" name="status" defaultValue={current} className="select">
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      {repair && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quote amount (R)" name="quote_amount" type="number" min={0} step="1" defaultValue={repair.quote_amount ?? ""} error={e.quote_amount} hint="Changing the amount asks the customer to accept/decline." />
          <Field label="Confirmed appointment (SAST)" name="appointment_at" type="datetime-local" defaultValue={toLocal(repair.appointment_at)} hint="Only fill in once agreed with the customer." />
          <TextArea className="sm:col-span-2" label="Quote details" name="quote_message" rows={3} maxLength={2000} defaultValue={repair.quote_message ?? ""} />
        </div>
      )}
      <div>
        <TextArea
          label="Message to the customer (visible in their account)"
          name="customer_message"
          rows={4}
          maxLength={2000}
          defaultValue={message ?? ""}
          ref={msgRef}
        />
        {snippets.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {snippets.map((s) => (
              <button
                key={s.label}
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  const el = msgRef.current;
                  if (el) el.value = (el.value ? el.value + "\n\n" : "") + s.text;
                }}
              >
                + {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <SubmitButton pending={submitting} pendingText="Saving…">Save &amp; notify customer</SubmitButton>
      <p className="text-xs text-tan">The customer gets an in-app notification. Email is sent only if email is configured.</p>
    </form>
  );
}

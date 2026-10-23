"use client";

import { useActionState, useState } from "react";
import { initialState, type ActionState } from "@/lib/actions";
import { CheckboxField, FormMessage, SelectField, SubmitButton, TextArea, TextField } from "@/components/forms/FormBits";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Generic workflow status form: status + customer-visible message (+ optional private note). */
export function StatusUpdateForm({
  action,
  id,
  options,
  current,
  withNote,
  emailAvailable,
  extraHidden,
  submitLabel = "Update status",
}: {
  action: Action;
  id: string;
  options: { value: string; label: string }[];
  current: string;
  withNote?: boolean;
  emailAvailable: boolean;
  extraHidden?: Record<string, string>;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const [status, setStatus] = useState(options.find((o) => o.value === current)?.value ?? options[0]?.value ?? "");
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      {extraHidden && Object.entries(extraHidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SelectField label="New status" name="status" options={options} value={status} onChange={(e) => setStatus(e.target.value)} state={state} />
      {status === "payment_confirmed" && (
        <div className="rounded-lg border border-warning/40 bg-warning-bg p-3 text-sm">
          <CheckboxField
            name="confirm_bank_checked"
            state={state}
            label="I have personally checked my bank account and confirm that this customer's EFT has been received and cleared."
          />
        </div>
      )}
      <TextArea label="Message to customer (visible in their account)" name="customer_message" rows={3} maxLength={2000} state={state} hint="Never include banking details here — send EFT details privately." />
      {withNote && <TextArea label="Private note (admin only)" name="admin_note" rows={2} maxLength={4000} state={state} />}
      {emailAvailable && <CheckboxField name="email_customer" label="Also email this update to the customer" />}
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary btn-sm" pendingText="Saving…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

export function AmountMessageForm({
  action,
  id,
  amountLabel,
  messageLabel,
  submitLabel,
  emailAvailable,
}: {
  action: Action;
  id: string;
  amountLabel: string;
  messageLabel: string;
  submitLabel: string;
  emailAvailable: boolean;
}) {
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <TextField label={amountLabel} name="amount" type="number" min={0} step="0.01" required inputMode="decimal" state={state} />
      <TextArea label={messageLabel} name="message" rows={3} maxLength={2000} state={state} />
      {emailAvailable && <CheckboxField name="email_customer" label="Also email the customer" />}
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary btn-sm" pendingText="Sending…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

export function NoteForm({ action, entityType, entityId, path }: { action: Action; entityType: string; entityId: string; path: string }) {
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-2" key={state.ts}>
      <input type="hidden" name="entity_type" value={entityType} />
      <input type="hidden" name="entity_id" value={entityId} />
      <input type="hidden" name="path" value={path} />
      <TextArea label="Add a private note" name="note" rows={2} maxLength={4000} required state={state} />
      <FormMessage state={state} />
      <SubmitButton className="btn btn-outline btn-sm" pendingText="Saving…">
        Save note
      </SubmitButton>
    </form>
  );
}

/** A form for actions that need a ticked confirmation checkbox. */
export function ConfirmCheckboxForm({
  action,
  hidden,
  checkboxLabel,
  submitLabel,
  danger,
  children,
}: {
  action: Action;
  hidden: Record<string, string>;
  checkboxLabel: string;
  submitLabel: string;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, initialState);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={formAction} className="space-y-3">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
      <CheckboxField name="confirm" required label={checkboxLabel} />
      <FormMessage state={state} />
      <SubmitButton className={`btn btn-sm ${danger ? "btn-danger" : "btn-primary"}`} pendingText="Working…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

/** Generic settings form wrapper for server actions. */
export function SettingsForm({ action, children, submitLabel = "Save" }: { action: Action; children: React.ReactNode; submitLabel?: string }) {
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-4">
      {children}
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary btn-sm" pendingText="Saving…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

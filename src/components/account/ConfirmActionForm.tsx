"use client";

import { useActionState } from "react";
import { initialState, type ActionState } from "@/lib/actions";
import { FormMessage, SubmitButton } from "@/components/forms/FormBits";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  hidden: Record<string, string>;
  label: string;
  pendingText?: string;
  confirmText?: string;
  className?: string;
  children?: React.ReactNode;
};

/** Small form that runs a server action, optionally after a browser confirmation. */
export function ConfirmActionForm({ action, hidden, label, pendingText = "Working…", confirmText, className = "btn btn-outline btn-sm", children }: Props) {
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
      className="space-y-2"
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
      {!state.ok && (
        <SubmitButton className={className} pendingText={pendingText}>
          {label}
        </SubmitButton>
      )}
      <FormMessage state={state} />
    </form>
  );
}

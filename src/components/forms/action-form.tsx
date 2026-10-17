"use client";

import type { ReactNode } from "react";
import { useActionForm } from "./use-action-form";
import type { ActionResult } from "@/lib/errors";
import { FormResult, SubmitButton } from "./form-bits";
import { Alert } from "../ui/misc";

type Act = (prev: never, form: FormData) => Promise<ActionResult<unknown>>;
type LooseAct = (prev: ActionResult<unknown> | null, form: FormData) => Promise<ActionResult<unknown>>;

/**
 * Generic form wired to a server action, showing success/errors (including per-field messages).
 * Used across account and admin screens.
 */
export function ActionForm({ action, children, submitLabel, pendingLabel, variant, className, hideOnSuccess, confirm }: { action: Act; children: ReactNode; submitLabel: string; pendingLabel?: string; variant?: "primary" | "outline" | "danger" | "subtle"; className?: string; hideOnSuccess?: boolean; confirm?: string }) {
  const [state, onSubmit, pending] = useActionForm(action as unknown as LooseAct, null);
  if (hideOnSuccess && state?.ok) return <FormResult state={state} />;
  const fieldErrs = state && !state.ok && state.fieldErrors ? Object.entries(state.fieldErrors).filter(([, v]) => v?.length) : [];
  return (
    <form
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) return e.preventDefault();
        onSubmit(e);
      }}
      className={className ?? "space-y-4"}
    >
      {children}
      <FormResult state={state} />
      {fieldErrs.length > 0 && (
        <Alert tone="danger">
          <ul>{fieldErrs.map(([k, v]) => <li key={k}><strong>{k}</strong>: {v![0]}</li>)}</ul>
        </Alert>
      )}
      <SubmitButton variant={variant} pendingLabel={pendingLabel} pending={pending}>{submitLabel}</SubmitButton>
    </form>
  );
}

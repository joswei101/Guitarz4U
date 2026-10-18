"use client";

import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/errors";
import { Button } from "../ui/button";
import { Alert } from "../ui/misc";

export function SubmitButton({ children, pendingLabel = "Please wait…", variant, size, className, pending: pendingProp }: { children: React.ReactNode; pendingLabel?: string; variant?: "primary" | "outline" | "danger" | "subtle" | "ghost"; size?: "sm" | "md" | "lg"; className?: string; pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending} variant={variant} size={size} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function FormResult({ state }: { state: ActionResult<unknown> | null | undefined }) {
  if (!state) return null;
  if (state.ok) return state.message ? <Alert tone="ok">{state.message}</Alert> : null;
  return <Alert tone="danger">{state.error}</Alert>;
}

export function fe(state: ActionResult<unknown> | null | undefined, field: string): string | undefined {
  return state && !state.ok ? state.fieldErrors?.[field]?.[0] : undefined;
}

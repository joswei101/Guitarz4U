"use client";
import { startTransition, useActionState, type FormEvent } from "react";
import type { ActionResult } from "@/lib/validation";

/**
 * Like useActionState, but submits via onSubmit so React does NOT clear the
 * form afterwards — if validation fails, everything the visitor typed stays.
 */
export function useFormAction(action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>) {
  const [state, dispatch, pending] = useActionState(action, null);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => dispatch(fd));
  };
  return { state, onSubmit, pending };
}

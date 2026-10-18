"use client";

import { startTransition, useActionState, type FormEvent } from "react";

type Loose = (prev: unknown, form: FormData) => Promise<unknown>;

/**
 * Like useActionState, but submits through onSubmit so React does not reset the form's fields
 * afterwards — users keep what they typed when the server returns a validation error.
 * The clicked submit button's name/value is included in the submitted data.
 */
export function useActionForm<S>(action: (prev: S | null, form: FormData) => Promise<S>, initial: S | null) {
  const [state, dispatch, pending] = useActionState<unknown, FormData>(action as Loose, initial);
  const onSubmit = (e: FormEvent<HTMLFormElement>, route?: (form: FormData) => void) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const data = new FormData(e.currentTarget, submitter);
    startTransition(() => (route ? route(data) : dispatch(data)));
  };
  return [state as S | null, onSubmit, pending, dispatch as (form: FormData) => void] as const;
}

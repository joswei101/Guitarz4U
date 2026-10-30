'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { TURNSTILE_SITE_KEY } from '@/lib/env';
import type { ActionState } from '@/lib/action-state';

export function SubmitButton({ children, className = 'btn btn-primary', pendingText = 'Sending…', disabled }: {
  children: React.ReactNode; className?: string; pendingText?: string; disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-disabled={pending || disabled}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Asks for confirmation before a destructive or important action. */
export function ConfirmButton({ children, message, className = 'btn btn-outline btn-small', name, value }: {
  children: React.ReactNode; message: string; className?: string; name?: string; value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={className}
      disabled={pending}
      onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}
    >
      {pending ? 'Working…' : children}
    </button>
  );
}

/** Hidden anti-spam fields: honeypot, start time and (optional) Turnstile widget. */
export function GuardFields() {
  const [ts, setTs] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setTs(String(Date.now()));
    if (!TURNSTILE_SITE_KEY || !ref.current) return;
    const id = 'cf-turnstile-script';
    if (!document.getElementById(id)) {
      const s = document.createElement('script');
      s.id = id;
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      s.async = true;
      document.head.appendChild(s);
    }
  }, []);
  return (
    <>
      <div className="hp-field" aria-hidden="true">
        <label>Leave this empty<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <input type="hidden" name="_ts" value={ts} />
      {TURNSTILE_SITE_KEY ? <div ref={ref} className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} /> : null}
    </>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) return <div role="alert" className="alert alert-error">{state.error}</div>;
  if (state.message) return <div role="status" className="alert alert-success">{state.message}</div>;
  return null;
}

export function FieldError({ state, name }: { state: ActionState; name: string }) {
  const msg = state.fieldErrors?.[name];
  return msg ? <span className="field-error" id={`${name}-error`}>{msg}</span> : null;
}

/** Props for an input so it shows and announces its validation error. */
export function errProps(state: ActionState, name: string) {
  const invalid = Boolean(state.fieldErrors?.[name]);
  return invalid ? { 'aria-invalid': true as const, 'aria-describedby': `${name}-error` } : {};
}

export function val(state: ActionState, name: string, fallback = '') {
  return state.values?.[name] ?? fallback;
}

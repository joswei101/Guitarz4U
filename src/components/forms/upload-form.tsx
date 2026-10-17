"use client";

import { useRef, useState, type ReactNode } from "react";
import { Alert } from "../ui/misc";
import { Button } from "../ui/button";

type Result = { ok: true; reference: string } | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

/**
 * Multipart form with upload progress, posting to a route handler. Field-level errors are shown
 * next to inputs via data attributes and in a summary list for screen readers.
 */
export function UploadForm({ endpoint, children, submitLabel, success }: { endpoint: string; children: ReactNode; submitLabel: string; success: (reference: string) => ReactNode }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (ev) => ev.lengthComputable && setProgress(Math.round((ev.loaded / ev.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      try {
        const res = JSON.parse(xhr.responseText) as Result;
        setResult(res);
        if (!res.ok) form.querySelector<HTMLElement>("[role=alert]")?.focus();
        else window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        setResult({ ok: false, error: xhr.status === 413 ? "Your files are too large. Please upload smaller photos or a shorter video." : "Something went wrong. Please try again." });
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setResult({ ok: false, error: "Network error — please check your connection and try again." });
    };
    setResult(null);
    setProgress(0);
    xhr.send(data);
  }

  if (result?.ok) return <div aria-live="polite">{success(result.reference)}</div>;
  const errs = result && !result.ok && result.fieldErrors ? Object.entries(result.fieldErrors).filter(([, v]) => v?.length) : [];
  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6" encType="multipart/form-data" noValidate={false}>
      {children}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {result && !result.ok && (
        <Alert tone="danger" title={result.error}>
          {errs.length > 0 && <ul className="list-disc pl-5">{errs.map(([k, v]) => <li key={k}>{labelFor(k)}: {v![0]}</li>)}</ul>}
        </Alert>
      )}
      {progress !== null && (
        <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress" className="h-2 overflow-hidden rounded bg-ink-600">
          <div className="h-full bg-amp transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <Button type="submit" size="lg" disabled={progress !== null}>{progress !== null ? (progress < 100 ? `Uploading… ${progress}%` : "Processing…") : submitLabel}</Button>
    </form>
  );
}

function labelFor(k: string) {
  return ({ name: "Name", email: "Email", phone: "Phone", instrumentType: "Type", condition: "Condition", problem: "Problem description", services: "Services", privacy: "Privacy notice" } as Record<string, string>)[k] ?? k;
}

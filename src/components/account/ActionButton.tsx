"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { ActionResult } from "@/lib/validation";

/** Runs a bound server action, with optional confirmation, and shows the result. */
export function ActionButton({
  action,
  children,
  confirm,
  className = "btn btn-outline",
  pendingText = "Working…",
}: {
  action: () => Promise<ActionResult<unknown>>;
  children: React.ReactNode;
  confirm?: string;
  className?: string;
  pendingText?: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        className={className}
        disabled={pending}
        aria-busy={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const r = await action();
            setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Done.") : r.error });
            if (r.ok) router.refresh();
          });
        }}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {pendingText}
          </>
        ) : (
          children
        )}
      </button>
      {msg && (
        <span role="status" className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`}>
          {msg.text}
        </span>
      )}
    </span>
  );
}

/** Small "send a message" form bound to a server action taking the message text. */
export function ReplyBox({
  action,
  label = "Reply to Guitarz4U",
  placeholder,
}: {
  action: (message: string) => Promise<ActionResult<unknown>>;
  label?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await action(text);
          setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Sent.") : r.error });
          if (r.ok) {
            setText("");
            router.refresh();
          }
        });
      }}
      className="space-y-2"
    >
      <label htmlFor="reply-box" className="label">
        {label}
      </label>
      <textarea id="reply-box" className="textarea" rows={3} maxLength={1500} value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} required minLength={2} />
      <button className="btn btn-primary btn-sm" disabled={pending || text.trim().length < 2}>
        {pending ? "Sending…" : "Send"}
      </button>
      {msg && (
        <p role="status" className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}

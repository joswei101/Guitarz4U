"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { processDataRequest } from "@/app/actions/admin";

export function DataRequestActions({ id, type, userId }: { id: string; type: string; userId: string | null }) {
  const [response, setResponse] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (action: "complete" | "reject" | "anonymise", confirmText: string) =>
    confirm(confirmText) &&
    start(async () => {
      const r = await processDataRequest(id, action, userId, response);
      setMsg({ ok: r.ok, text: r.ok ? r.message! : r.error });
      router.refresh();
    });
  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor={`dr-${id}`}>Response</label>
      <input id={`dr-${id}`} className="input" placeholder="Message to the customer (optional)" value={response} onChange={(e) => setResponse(e.target.value)} maxLength={2000} />
      <div className="flex flex-wrap gap-2">
        {type === "deletion" ? (
          <button type="button" className="btn btn-danger btn-sm" disabled={pending} onClick={() => run("anonymise", "Delete this customer's login and remove their personal details? This cannot be undone. Business records are kept anonymised.")}>
            Delete account &amp; anonymise
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run("complete", "Mark as completed?")}>
            Mark completed
          </button>
        )}
        <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run("reject", "Reject this request? Give a reason in the message.")}>
          Reject
        </button>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
    </div>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addAdminNote } from "@/app/actions/admin";

export function NoteForm({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addAdminNote(entityType, entityId, text);
          if (r.ok) {
            setText("");
            setErr(null);
            router.refresh();
          } else setErr(r.error);
        });
      }}
    >
      <label htmlFor={`note-${entityId}`} className="sr-only">New note</label>
      <textarea id={`note-${entityId}`} className="textarea !min-h-20" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a private note…" maxLength={4000} />
      <button className="btn btn-outline btn-sm" disabled={pending || !text.trim()}>{pending ? "Saving…" : "Add note"}</button>
      {err && <p className="field-error">{err}</p>}
    </form>
  );
}

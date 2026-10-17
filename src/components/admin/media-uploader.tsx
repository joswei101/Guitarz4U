"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../ui/button";
import { Alert } from "../ui/misc";

export function MediaUploader({ productId }: { productId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/media`, { method: "POST", body: new FormData(form) });
      const json = (await res.json()) as { ok: boolean; error?: string; reference?: string };
      setMsg(json.ok ? { ok: true, text: `Uploaded ${json.reference} file(s).` } : { ok: false, text: json.error ?? "Upload failed" });
      if (json.ok) {
        form.reset();
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "Upload failed — check your connection." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Photos (JPEG/PNG/WebP, max 10 MB each, up to 8 per upload)
          <input name="photos" type="file" multiple accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm text-bone-muted file:mr-3 file:rounded file:border-0 file:bg-amp file:px-3 file:py-1.5 file:text-ink" />
        </label>
        <label className="text-sm">Video (MP4/MOV/WebM, max 50 MB)
          <input name="video" type="file" accept="video/mp4,video/quicktime,video/webm" className="mt-1 block w-full text-sm text-bone-muted file:mr-3 file:rounded file:border-0 file:bg-ink-500 file:px-3 file:py-1.5 file:text-bone" />
        </label>
      </div>
      <Button type="submit" size="sm" disabled={busy}>{busy ? "Uploading…" : "Upload"}</Button>
      {msg && <Alert tone={msg.ok ? "ok" : "danger"}>{msg.text}</Alert>}
    </form>
  );
}

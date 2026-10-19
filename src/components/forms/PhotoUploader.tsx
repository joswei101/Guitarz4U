"use client";

/* eslint-disable @next/next/no-img-element -- local blob previews */
import { useId, useState } from "react";
import { uploadImage } from "@/lib/image-upload";

type Uploaded = { path: string; previewUrl: string };

/**
 * Uploads photos directly from the browser to the private "customer-uploads"
 * bucket, inside the signed-in user's own folder (enforced by storage policies).
 * The resulting storage paths are submitted with the form as hidden inputs.
 */
export function PhotoUploader({
  userId,
  max = 8,
  name = "image_paths",
  onBusyChange,
}: {
  userId: string;
  max?: number;
  name?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [items, setItems] = useState<Uploaded[]>([]);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = max - items.length;
    const chosen = Array.from(files).slice(0, room);
    if (files.length > room) setError(`You can upload up to ${max} photographs.`);
    setBusy((b) => b + chosen.length);
    onBusyChange?.(true);
    for (const file of chosen) {
      try {
        const uploaded = await uploadImage("customer-uploads", userId, file);
        setItems((prev) => [...prev, uploaded]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setBusy((b) => {
          const next = b - 1;
          if (next === 0) onBusyChange?.(false);
          return next;
        });
      }
    }
  }

  return (
    <div className="field">
      <label htmlFor={inputId} className="label">
        Photographs <span className="font-normal text-ink-soft">(up to {max})</span>
      </label>
      <p className="hint">
        Clear photos of the front, back, headstock and any damage help us most. Photos are resized on your device before
        uploading and are only visible to you and Guitarz4U.
      </p>
      {items.length > 0 && (
        <ul className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {items.map((it, i) => (
            <li key={it.path} className="relative">
              <img src={it.previewUrl} alt={`Selected photograph ${i + 1}`} className="aspect-square w-full rounded-md object-cover" />
              <input type="hidden" name={name} value={it.path} />
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((p) => p.path !== it.path))}
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-deep text-xs text-cream"
                aria-label={`Remove photograph ${i + 1}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length < max && (
        <label
          htmlFor={inputId}
          className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gold/50 bg-cream/40 p-6 text-center text-sm hover:bg-cream"
        >
          <span className="font-semibold text-walnut">{busy ? `Uploading ${busy} photo${busy === 1 ? "" : "s"}…` : "Tap to add photographs"}</span>
          <span className="text-xs text-ink-soft">JPEG, PNG or WebP</span>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

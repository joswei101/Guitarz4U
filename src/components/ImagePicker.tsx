"use client";
import { useEffect, useState } from "react";

/**
 * Photo picker that shrinks images in the browser before upload (max 1600px,
 * JPEG). This keeps uploads fast on mobile data and within free-hosting
 * request limits. The server re-validates and re-encodes every image.
 */
export function ImagePicker({
  name = "photos",
  max = 8,
  label = "Photos",
  hint,
  error,
  onChange,
}: {
  name?: string;
  max?: number;
  label?: string;
  hint?: string;
  error?: string;
  onChange: (files: File[]) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    onChange(files);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  async function handle(list: FileList | null) {
    if (!list) return;
    setLocalError("");
    const incoming = Array.from(list);
    const room = max - files.length;
    if (incoming.length > room) setLocalError(`You can add up to ${max} photos.`);
    setBusy(true);
    const out: File[] = [];
    for (const f of incoming.slice(0, Math.max(0, room))) {
      if (!f.type.startsWith("image/")) {
        setLocalError(`"${f.name}" is not an image.`);
        continue;
      }
      out.push(await compress(f));
    }
    setBusy(false);
    setFiles((prev) => [...prev, ...out]);
  }

  return (
    <div className="field field-full">
      <label htmlFor={`${name}-input`}>{label}</label>
      <input
        id={`${name}-input`}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
        aria-describedby={`${name}-hint`}
        disabled={busy || files.length >= max}
      />
      <span className="hint" id={`${name}-hint`}>
        {hint ?? `Up to ${max} photos (JPG, PNG or WebP). Location data is removed from photos when they are uploaded.`}
        {busy && " Preparing photos…"}
      </span>
      {(localError || error) && <span className="field-error" role="alert">{localError || error}</span>}
      {previews.length > 0 && (
        <div className="upload-previews">
          {previews.map((src, i) => (
            <figure key={src}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Selected photo ${i + 1}`} />
              <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}>×</button>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

async function compress(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // browser could not decode (e.g. HEIC on desktop) — let the server try
  }
}

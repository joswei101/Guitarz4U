"use client";
import { useState } from "react";

/**
 * A normal <input type="file"> for admin forms that shrinks the chosen photos in
 * the browser (max 1600px JPEG) before the form is submitted, so uploads stay
 * small on mobile data and within hosting request limits.
 */
export function CompressingFileInput({ name, id, max = 12 }: { name: string; id: string; max?: number }) {
  const [status, setStatus] = useState("");
  return (
    <>
      <input
        id={id}
        name={name}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={async (e) => {
          const input = e.currentTarget;
          const files = Array.from(input.files ?? []).slice(0, max);
          if (!files.length) return setStatus("");
          setStatus("Preparing photos…");
          const dt = new DataTransfer();
          for (const f of files) dt.items.add(await compress(f));
          input.files = dt.files;
          const kb = Math.round(Array.from(dt.files).reduce((s, f) => s + f.size, 0) / 1024);
          setStatus(`${dt.files.length} photo(s) ready (${kb} KB).`);
        }}
      />
      <span className="hint" aria-live="polite">{status || `Up to ${max} photos. They are resized automatically and location data is removed.`}</span>
    </>
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
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.86));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useId, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { MAX_UPLOAD_PHOTOS } from "@/lib/constants";

/** Lets visitors choose photos, preview them and remove mistakes before upload. */
export function PhotoPicker({
  files,
  onChange,
  max = MAX_UPLOAD_PHOTOS,
  label = "Photos",
  hint,
  error,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  max?: number;
  label?: string;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const [previews, setPreviews] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URLs must be created/revoked with the files
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  return (
    <div>
      <p className="label" id={`${id}-label`}>
        {label}
      </p>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4" aria-labelledby={`${id}-label`}>
        {previews.map((src, i) => (
          <li key={src} className="relative">
            <img src={src} alt={`Selected photo ${i + 1}`} className="aspect-square w-full rounded-md border border-gold/40 object-cover" />
            <button
              type="button"
              className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-espresso/80 text-ivory"
              aria-label={`Remove photo ${i + 1}`}
              onClick={() => onChange(files.filter((_, j) => j !== i))}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
        {files.length < max && (
          <li>
            <label
              htmlFor={id}
              className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-tan/60 bg-white text-center text-xs text-tan hover:border-gold hover:text-walnut"
            >
              <ImagePlus className="h-6 w-6" aria-hidden />
              Add photos
            </label>
            <input
              id={id}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              className="sr-only"
              onChange={(e) => {
                const chosen = Array.from(e.target.files ?? []);
                e.target.value = "";
                const images = chosen.filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
                if (images.length < chosen.length) setLocalError("Only image files can be uploaded.");
                else if (files.length + images.length > max) setLocalError(`You can add up to ${max} photos.`);
                else setLocalError(null);
                onChange([...files, ...images].slice(0, max));
              }}
            />
          </li>
        )}
      </ul>
      <p className="hint">
        {hint ?? `Up to ${max} photos (JPG, PNG or WebP). Photos are resized on your device before upload.`}
      </p>
      {(localError || error) && <p className="field-error">{localError || error}</p>}
    </div>
  );
}

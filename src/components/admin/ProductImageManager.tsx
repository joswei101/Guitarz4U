"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addProductImageAction, updateImageAction } from "@/app/admin/actions";
import { uploadImage } from "@/lib/image-upload";
import { productImageUrl } from "@/lib/images";

type Img = { id: string; storage_path: string; alt_text: string | null; sort_order: number };

export function ProductImageManager({ productId, productTitle, images }: { productId: string; productTitle: string; images: Img[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const chosen = Array.from(files).slice(0, Math.max(0, 12 - images.length));
    setBusy(chosen.length);
    for (const [i, file] of chosen.entries()) {
      try {
        const { path } = await uploadImage("product-images", productId, file);
        const res = await addProductImageAction(productId, path, `${productTitle} — photograph ${images.length + i + 1}`);
        if (!res.ok) setError(res.message ?? "Could not save the image.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setBusy((b) => b - 1);
      }
    }
    router.refresh();
  }

  return (
    <section className="card p-5" aria-labelledby="photos-heading">
      <h2 id="photos-heading" className="text-xl">
        Photographs ({images.length}/12)
      </h2>
      <p className="mt-1 text-sm text-ink-soft">The first photograph is the main image. Photos are resized in your browser before upload. Add descriptive alt text for accessibility and search engines.</p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {images.map((img, i) => (
          <li key={img.id} className="rounded-lg border border-line bg-white p-3">
            <div className="relative aspect-[4/5] overflow-hidden rounded bg-cream">
              <Image src={productImageUrl(img.storage_path)} alt={img.alt_text ?? ""} fill sizes="20rem" className="object-cover" />
              {i === 0 && <span className="badge badge-gold absolute left-2 top-2">Main photo</span>}
            </div>
            <form action={updateImageAction} className="mt-2 flex gap-2">
              <input type="hidden" name="image_id" value={img.id} />
              <input type="hidden" name="product_id" value={productId} />
              <input type="hidden" name="op" value="alt" />
              <label className="sr-only" htmlFor={`alt-${img.id}`}>
                Alt text
              </label>
              <input id={`alt-${img.id}`} name="alt_text" defaultValue={img.alt_text ?? ""} maxLength={200} placeholder="Describe the photo" className="input h-9 min-h-0 py-1 text-sm" />
              <button className="btn btn-outline btn-sm">Save</button>
            </form>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(
                [
                  ["first", "Make main", i === 0],
                  ["up", "← Move", i === 0],
                  ["down", "Move →", i === images.length - 1],
                ] as const
              ).map(([op, label, disabled]) => (
                <form key={op} action={updateImageAction}>
                  <input type="hidden" name="image_id" value={img.id} />
                  <input type="hidden" name="product_id" value={productId} />
                  <input type="hidden" name="op" value={op} />
                  <button className="btn btn-outline btn-sm" disabled={disabled}>
                    {label}
                  </button>
                </form>
              ))}
              <form
                action={updateImageAction}
                onSubmit={(e) => {
                  if (!window.confirm("Delete this photograph?")) e.preventDefault();
                }}
              >
                <input type="hidden" name="image_id" value={img.id} />
                <input type="hidden" name="product_id" value={productId} />
                <input type="hidden" name="op" value="delete" />
                <button className="btn btn-sm text-danger hover:bg-danger-bg">Delete</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
      {images.length < 12 && (
        <label className="mt-4 flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-gold/60 bg-cream/40 p-6 text-center hover:bg-cream">
          <span className="font-semibold text-walnut">{busy ? `Uploading ${busy}…` : "Add photographs"}</span>
          <span className="text-xs text-ink-soft">JPEG, PNG or WebP · resized to max 1600px</span>
          <input
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
        <p role="alert" className="field-error mt-2">
          {error}
        </p>
      )}
    </section>
  );
}

'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { addProductImage } from '@/app/actions/admin-catalogue';
import { createBrowserSupabase } from '@/lib/supabase/browser';

/** Resize an image in the browser and return a WebP (or JPEG) blob. */
async function resize(file: File, maxSide: number, quality: number) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  let blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/webp', quality));
  let type = 'image/webp';
  if (!blob || blob.type !== 'image/webp') {
    blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
    type = 'image/jpeg';
  }
  return { blob: blob!, type, width: canvas.width, height: canvas.height };
}

/**
 * Uploads product photos straight to storage. Each photo is saved twice:
 * a large version (max 1600px) and a small thumbnail (max 600px), which keeps
 * pages fast and storage use low on the free plan.
 */
export function ImageUploader({ productId, defaultAlt }: { productId: string; defaultAlt: string }) {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const supabase = createBrowserSupabase();
    let done = 0;
    for (const file of Array.from(files)) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setStatus(`"${file.name}" skipped — use JPEG, PNG or WebP photos.`);
        continue;
      }
      try {
        setStatus(`Preparing ${file.name}…`);
        const big = await resize(file, 1600, 0.82);
        const small = await resize(file, 600, 0.78);
        const ext = big.type === 'image/webp' ? 'webp' : 'jpg';
        const id = crypto.randomUUID();
        const path = `${productId}/${id}.${ext}`;
        const thumbPath = `${productId}/${id}-thumb.${ext}`;
        setStatus(`Uploading ${file.name}…`);
        const a = await supabase.storage.from('product-images').upload(path, big.blob, { contentType: big.type, cacheControl: '31536000' });
        const b = await supabase.storage.from('product-images').upload(thumbPath, small.blob, { contentType: small.type, cacheControl: '31536000' });
        if (a.error || b.error) throw new Error((a.error ?? b.error)!.message);
        const res = await addProductImage({ productId, path, thumbPath, width: big.width, height: big.height, alt: defaultAlt });
        if (res.error) throw new Error(res.error);
        done++;
      } catch (e) {
        setStatus(`Could not upload "${file.name}": ${e instanceof Error ? e.message : 'unknown error'}`);
      }
    }
    setBusy(false);
    if (done) setStatus(`${done} photo(s) uploaded.`);
    router.refresh();
  }

  return (
    <div className="field">
      <label htmlFor="img-upload">Add photos <span className="hint">(JPEG, PNG or WebP — resized automatically)</span></label>
      <input id="img-upload" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy}
        onChange={(e) => { void upload(e.target.files); e.target.value = ''; }} />
      {status ? <p className="small" role="status">{status}</p> : null}
      <p className="small muted">Only upload real photos of this guitar. The first photo is used as the main image.</p>
    </div>
  );
}

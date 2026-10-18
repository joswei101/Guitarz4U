"use client";
/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage, publicImageUrl, randomFileName } from "@/lib/images";
import { deleteImage, reorderImages, updateImageAlt } from "@/app/actions/admin";
import { PhotoPicker } from "@/components/forms/PhotoPicker";

type Img = { id: string; storage_path: string; alt_text: string; sort_order: number };

export function ImageManager({ productId, productTitle, images }: { productId: string; productTitle: string; images: Img[] }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [order, setOrder] = useState(images);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [lastImages, setLastImages] = useState(images);
  if (images !== lastImages) {
    setLastImages(images);
    setOrder(images);
  }

  const upload = () =>
    start(async () => {
      const supabase = createClient();
      const errors: string[] = [];
      let n = order.length;
      for (const [i, file] of files.entries()) {
        setMsg(`Uploading ${i + 1}/${files.length}…`);
        try {
          const { blob, type, width, height } = await compressImage(file, 2000, 0.85);
          const path = `${productId}/${randomFileName(type)}`;
          const { error } = await supabase.storage.from("product-images").upload(path, blob, { contentType: type, cacheControl: "31536000" });
          if (error) throw new Error(error.message);
          const { error: dbErr } = await supabase.from("product_images").insert({
            product_id: productId,
            storage_path: path,
            alt_text: `${productTitle} — photo ${n + 1}`,
            sort_order: n,
            width,
            height,
          });
          if (dbErr) {
            await supabase.storage.from("product-images").remove([path]);
            throw new Error(dbErr.message);
          }
          n++;
        } catch (e) {
          errors.push(`${file.name}: ${(e as Error).message}`);
        }
      }
      setFiles([]);
      setMsg(errors.length ? `Some uploads failed: ${errors.join("; ")}` : "Photos uploaded.");
      router.refresh();
    });

  const move = (i: number, d: number) => {
    const next = [...order];
    const [item] = next.splice(i, 1);
    next.splice(i + d, 0, item);
    setOrder(next);
    start(async () => {
      const r = await reorderImages(productId, next.map((x) => x.id));
      setMsg(r.ok ? "Order saved — the first photo is the main image." : r.error);
      router.refresh();
    });
  };

  return (
    <section className="card p-5" aria-labelledby="img-h">
      <h2 id="img-h" className="text-xl">Photos</h2>
      <p className="text-sm text-tan">The first photo is used on product cards. Photos are resized to max 2000px before upload.</p>
      {order.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {order.map((img, i) => (
            <li key={img.id} className="flex gap-3 rounded-md border border-gold/30 bg-white p-2">
              <img src={publicImageUrl(img.storage_path)!} alt={img.alt_text} className="h-24 w-20 flex-none rounded object-cover" />
              <div className="min-w-0 flex-1 space-y-2">
                <label className="sr-only" htmlFor={`alt-${img.id}`}>Alt text</label>
                <input
                  id={`alt-${img.id}`}
                  className="input !min-h-9 text-sm"
                  defaultValue={img.alt_text}
                  placeholder="Describe the photo (for accessibility)"
                  onBlur={(e) => e.target.value !== img.alt_text && start(async () => void (await updateImageAlt(img.id, e.target.value)))}
                />
                <div className="flex gap-1">
                  <button type="button" className="btn btn-ghost btn-sm" disabled={i === 0 || pending} onClick={() => move(i, -1)} aria-label="Move photo up">
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={i === order.length - 1 || pending} onClick={() => move(i, 1)} aria-label="Move photo down">
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-danger"
                    disabled={pending}
                    onClick={() => confirm("Delete this photo?") && start(async () => { const r = await deleteImage(img.id); setMsg(r.ok ? r.message! : r.error); router.refresh(); })}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden /> Delete
                  </button>
                  {i === 0 && <span className="badge badge-gold self-center">Main</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <PhotoPicker files={files} onChange={setFiles} max={Math.max(0, 24 - order.length)} label="Add photos" hint="Up to 24 photos per product." />
        {files.length > 0 && (
          <button type="button" className="btn btn-primary mt-3" onClick={upload} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Upload {files.length} photo{files.length === 1 ? "" : "s"}
          </button>
        )}
      </div>
      {msg && <p role="status" className="mt-3 text-sm">{msg}</p>}
    </section>
  );
}

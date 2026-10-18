"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { publicImageUrl } from "@/lib/images";
import { LogoMark } from "@/components/Logo";

type Img = { id: string; storage_path: string; alt_text: string };

export function ProductGallery({ images, title }: { images: Img[]; title: string }) {
  const [index, setIndex] = useState(0);
  if (!images.length) {
    return (
      <div className="card flex aspect-[4/5] items-center justify-center" role="img" aria-label={`${title} — photos coming soon`}>
        <div className="text-center text-tan">
          <LogoMark className="mx-auto h-20 w-20 opacity-50" />
          <p className="mt-3 text-sm">Photos coming soon — ask us on WhatsApp</p>
        </div>
      </div>
    );
  }
  const current = images[Math.min(index, images.length - 1)];
  const go = (d: number) => setIndex((i) => (i + d + images.length) % images.length);
  return (
    <div>
      <div className="card relative overflow-hidden">
        <img
          src={publicImageUrl(current.storage_path)!}
          alt={current.alt_text || `${title} — photo ${index + 1} of ${images.length}`}
          className="aspect-[4/5] w-full bg-cream-2 object-contain"
          fetchPriority={index === 0 ? "high" : "auto"}
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ivory/90 text-walnut shadow hover:bg-ivory"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ivory/90 text-walnut shadow hover:bg-ivory"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <p className="absolute bottom-2 right-3 rounded bg-espresso/75 px-2 py-0.5 text-xs text-ivory" aria-live="polite">
              {index + 1} / {images.length}
            </p>
          </>
        )}
      </div>
      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                className={`block w-full overflow-hidden rounded-md border-2 ${i === index ? "border-gold" : "border-transparent opacity-80 hover:opacity-100"}`}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
              >
                <img src={publicImageUrl(img.storage_path)!} alt="" loading="lazy" className="aspect-square w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

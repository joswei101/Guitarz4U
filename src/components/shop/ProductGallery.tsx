"use client";

import Image from "next/image";
import { useState } from "react";

type GalleryImage = { url: string; alt: string };

export function ProductGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];

  const go = (delta: number) => setIndex((i) => (i + delta + images.length) % images.length);

  return (
    <div className="space-y-3">
      <div
        className="card relative aspect-[4/5] overflow-hidden bg-cream"
        role="region"
        aria-roledescription="carousel"
        aria-label={`Photographs of ${title}`}
        tabIndex={images.length > 1 ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
      >
        <Image src={current.url} alt={current.alt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl text-walnut shadow hover:bg-white"
              aria-label="Previous photograph"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl text-walnut shadow hover:bg-white"
              aria-label="Next photograph"
            >
              ›
            </button>
            <p className="absolute bottom-3 right-3 rounded-full bg-deep/80 px-3 py-1 text-xs text-cream" aria-live="polite">
              {index + 1} / {images.length}
            </p>
          </>
        )}
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Choose a photograph">
          {images.map((img, i) => (
            <li key={img.url + i} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                className={`relative block h-20 w-16 overflow-hidden rounded-md border-2 ${i === index ? "border-gold" : "border-transparent opacity-75 hover:opacity-100"}`}
                aria-label={`Show photograph ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
              >
                <Image src={img.url} alt="" fill sizes="4rem" className="object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

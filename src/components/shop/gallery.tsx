"use client";

import { useState } from "react";
import { cn } from "../ui/cn";

type Media = { fileId: string; altText: string | null; kind: "IMAGE" | "VIDEO"; mimeType: string };

/** Product gallery with thumbnails, keyboard navigation, hover-zoom and a full-screen zoom view. */
export function Gallery({ media, title }: { media: Media[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  if (media.length === 0) return <div className="grid aspect-[4/3] place-items-center rounded-xl border border-ink-500 bg-ink-800 text-bone-dim">Photos coming soon</div>;
  const current = media[index];
  const go = (d: number) => setIndex((i) => (i + d + media.length) % media.length);

  return (
    <div className="space-y-3" onKeyDown={(e) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); if (e.key === "Escape") setZoom(false); }}>
      <div className="relative overflow-hidden rounded-xl border border-ink-500 bg-ink-800">
        {current.kind === "IMAGE" ? (
          <button type="button" className="block aspect-[4/3] w-full cursor-zoom-in overflow-hidden" onClick={() => setZoom(true)} aria-label={`Zoom photo ${index + 1} of ${media.length}`}
            onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/files/${current.fileId}`} alt={current.altText ?? `${title} — photo ${index + 1}`} style={{ transformOrigin: origin }} className="h-full w-full object-contain transition-transform duration-200 hover:scale-[1.8]" />
          </button>
        ) : (
          <video controls preload="metadata" className="aspect-[4/3] w-full bg-black" aria-label={`${title} video`}>
            <source src={`/api/files/${current.fileId}`} type={current.mimeType} />
          </video>
        )}
        {media.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/80 px-3 py-2 text-bone hover:text-amp" aria-label="Previous photo">‹</button>
            <button type="button" onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/80 px-3 py-2 text-bone hover:text-amp" aria-label="Next photo">›</button>
          </>
        )}
      </div>
      {media.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Choose photo">
          {media.map((m, i) => (
            <li key={m.fileId}>
              <button type="button" onClick={() => setIndex(i)} aria-current={i === index} aria-label={`Show ${m.kind === "VIDEO" ? "video" : "photo"} ${i + 1}`}
                className={cn("relative h-16 w-20 shrink-0 overflow-hidden rounded-md border-2", i === index ? "border-amp" : "border-transparent opacity-70 hover:opacity-100")}>
                {m.kind === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${m.fileId}?v=thumb`} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full place-items-center bg-ink-600 text-xs text-bone">▶ Video</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {zoom && current.kind === "IMAGE" && (
        <div role="dialog" aria-modal="true" aria-label="Zoomed photo" className="fixed inset-0 z-50 grid place-items-center bg-black/95 p-4" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/files/${current.fileId}`} alt={current.altText ?? title} className="max-h-full max-w-full object-contain" />
          <button type="button" autoFocus onClick={() => setZoom(false)} className="absolute right-4 top-4 rounded-md bg-ink-700 px-3 py-2 text-bone">Close ✕</button>
        </div>
      )}
    </div>
  );
}

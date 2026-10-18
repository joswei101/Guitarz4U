"use client";
import { useState } from "react";
import { IconGuitar } from "./icons";

export function Gallery({ images, title }: { images: { id: string; url: string; alt: string }[]; title: string }) {
  const [i, setI] = useState(0);
  if (images.length === 0) {
    return (
      <div className="gallery-main" style={{ display: "grid", placeItems: "center", color: "var(--muted)" }}>
        <div className="center"><IconGuitar className="brand-mark" /><p>Photos coming soon</p></div>
      </div>
    );
  }
  const current = images[Math.min(i, images.length - 1)];
  return (
    <div>
      <div className="gallery-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={current.alt || title} fetchPriority="high" />
      </div>
      {images.length > 1 && (
        <div className="thumbs" role="group" aria-label="Product photos">
          {images.map((img, n) => (
            <button key={img.id} type="button" onClick={() => setI(n)} aria-current={n === i ? "true" : undefined} aria-label={`Show photo ${n + 1} of ${images.length}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

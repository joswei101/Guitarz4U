'use client';
import { useState } from 'react';

type Img = { src: string; thumb: string; alt: string; width?: number | null; height?: number | null };

export function Gallery({ images, name }: { images: Img[]; name: string }) {
  const [i, setI] = useState(0);
  if (!images.length) {
    return <div className="gallery-main" style={{ display: 'grid', placeItems: 'center' }}><p className="muted">Photos coming soon</p></div>;
  }
  const current = images[i];
  return (
    <div>
      <div className="gallery-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.src} alt={current.alt || `${name} — photo ${i + 1}`} width={current.width ?? 1200} height={current.height ?? 1500} />
      </div>
      {images.length > 1 ? (
        <div className="gallery-thumbs" role="group" aria-label="Choose photo">
          {images.map((img, n) => (
            <button key={n} type="button" aria-pressed={n === i} aria-label={`Show photo ${n + 1} of ${images.length}`} onClick={() => setI(n)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumb} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

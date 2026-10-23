/* eslint-disable @next/next/no-img-element -- signed URLs are short-lived; plain lazy-loaded images are simplest */
export function PhotoGrid({ photos }: { photos: { path: string; url: string | null }[] }) {
  if (!photos.length) return <p className="text-sm text-ink-soft">No photographs were uploaded.</p>;
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {photos.map((p, i) => (
        <li key={p.path}>
          {p.url ? (
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md bg-cream">
              <img src={p.url} alt={`Uploaded photograph ${i + 1}`} loading="lazy" className="aspect-square w-full object-cover" />
            </a>
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-md bg-cream text-xs text-ink-soft">Unavailable</div>
          )}
        </li>
      ))}
    </ul>
  );
}

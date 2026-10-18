/* eslint-disable @next/next/no-img-element */
export function PhotoGrid({ urls, label }: { urls: string[]; label: string }) {
  if (!urls.length) return <p className="text-sm text-tan">No photos uploaded.</p>;
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {urls.map((u, i) => (
        <li key={u}>
          <a href={u} target="_blank" rel="noopener noreferrer">
            <img src={u} alt={`${label} photo ${i + 1}`} loading="lazy" className="aspect-square w-full rounded-md border border-gold/40 object-cover" />
          </a>
        </li>
      ))}
    </ul>
  );
}

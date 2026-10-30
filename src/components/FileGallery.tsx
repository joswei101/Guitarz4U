type F = { id: string; url: string | null; mime_type: string };

export function FileGallery({ files }: { files: F[] }) {
  if (!files.length) return <p className="muted small">No photos or videos uploaded.</p>;
  return (
    <div className="thumb-row">
      {files.map((f, i) => (
        <figure key={f.id}>
          {f.url && f.mime_type.startsWith('video/') ? (
            <video src={f.url} controls preload="metadata" aria-label={`Video ${i + 1}`} />
          ) : f.url && !/heic|heif/.test(f.mime_type) ? (
            <a href={f.url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={`Uploaded photo ${i + 1}`} loading="lazy" />
            </a>
          ) : f.url ? (
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="card-plain" style={{ display: 'grid', placeItems: 'center', width: 120, height: 120 }}>Open file</a>
          ) : <span className="muted">Unavailable</span>}
        </figure>
      ))}
    </div>
  );
}

'use client';
import { useState } from 'react';
import { ALLOWED_UPLOADS, MAX_FILES } from '@/lib/upload-rules';

export type PreparedFile = { name: string; type: string; size: number; blob: Blob; preview?: string };

/** Shrinks large photos in the browser (max 2000px, JPEG) to save storage and data. */
export async function compressImage(file: File, maxSide = 2000, quality = 0.85): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export function FilePicker({ allowVideo, files, onChange, id = 'files' }: {
  allowVideo: boolean; files: PreparedFile[]; onChange: (f: PreparedFile[]) => void; id?: string;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const accept = Object.entries(ALLOWED_UPLOADS).filter(([, r]) => allowVideo || !r.video).map(([t]) => t).join(',');

  async function handle(list: FileList | null) {
    setError('');
    if (!list) return;
    const chosen = Array.from(list);
    if (files.length + chosen.length > MAX_FILES) {
      setError(`You can add up to ${MAX_FILES} files.`);
      return;
    }
    setBusy(true);
    const next: PreparedFile[] = [];
    for (const f of chosen) {
      const rule = ALLOWED_UPLOADS[f.type as keyof typeof ALLOWED_UPLOADS];
      if (!rule || (rule.video && !allowVideo)) {
        setError(`"${f.name}" is not a supported file type. Use JPEG, PNG, WebP or HEIC photos${allowVideo ? ', or MP4/MOV/WebM videos' : ''}.`);
        continue;
      }
      const blob = rule.video ? f : await compressImage(f);
      const type = blob === f ? f.type : 'image/jpeg';
      if (blob.size > rule.maxBytes) {
        setError(`"${f.name}" is too large (max ${Math.round(rule.maxBytes / 1048576)} MB).`);
        continue;
      }
      next.push({
        name: f.name, type, size: blob.size, blob,
        preview: type.startsWith('image/') && type !== 'image/heic' && type !== 'image/heif' ? URL.createObjectURL(blob) : undefined,
      });
    }
    onChange([...files, ...next]);
    setBusy(false);
  }

  return (
    <div className="field field-full">
      <label htmlFor={id}>
        Photos{allowVideo ? ' or short videos' : ''} <span className="hint">(optional, up to {MAX_FILES}; photos up to 10 MB, videos up to 25 MB)</span>
      </label>
      {/* No "name" attribute: files are uploaded separately, straight to private storage. */}
      <input id={id} type="file" accept={accept} multiple onChange={(e) => { void handle(e.target.files); e.target.value = ''; }} />
      {busy ? <span className="hint" role="status">Preparing files…</span> : null}
      {error ? <span className="field-error" role="alert">{error}</span> : null}
      {files.length ? (
        <div className="thumb-row" aria-label="Selected files">
          {files.map((f, i) => (
            <figure key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {f.preview ? <img src={f.preview} alt={`Selected file ${i + 1}`} /> : <div className="card-plain" style={{ width: 120, height: 120, display: 'grid', placeItems: 'center' }}>{f.type.startsWith('video') ? 'Video' : 'Photo'}</div>}
              <figcaption>
                {(f.size / 1048576).toFixed(1)} MB ·{' '}
                <button type="button" className="link-button" onClick={() => onChange(files.filter((_, j) => j !== i))}>Remove</button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );
}

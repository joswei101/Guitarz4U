"use client";

import { useState } from "react";

export function FileInput({ id, name, label, accept, multiple, hint, maxFiles }: { id: string; name: string; label: string; accept: string; multiple?: boolean; hint: string; maxFiles?: number }) {
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-bone">{label}</label>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        aria-describedby={`${id}-hint`}
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files ?? []);
          if (maxFiles && files.length > maxFiles) {
            setError(`Please choose at most ${maxFiles} files.`);
            e.currentTarget.value = "";
            setNames([]);
            return;
          }
          setError(null);
          setNames(files.map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB)`));
        }}
        className="block w-full cursor-pointer rounded-md border border-dashed border-ink-400 bg-ink-800 p-3 text-sm text-bone-muted file:mr-4 file:rounded-md file:border-0 file:bg-amp file:px-4 file:py-2 file:font-semibold file:text-ink hover:border-amp"
      />
      <p id={`${id}-hint`} className="text-xs text-bone-dim">{hint}</p>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      {names.length > 0 && <ul className="text-xs text-bone-muted">{names.map((n) => <li key={n}>✓ {n}</li>)}</ul>}
    </div>
  );
}

export default function Loading() {
  return (
    <div className="container py-24" role="status" aria-live="polite">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-ink-400 border-t-amp" />
      <p className="sr-only">Loading…</p>
    </div>
  );
}

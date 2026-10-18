import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={makeHref(page - 1)} className="btn btn-outline btn-sm" rel="prev">
          ← Previous
        </Link>
      ) : (
        <span className="btn btn-outline btn-sm" aria-disabled="true">
          ← Previous
        </span>
      )}
      <span className="px-3 text-sm">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={makeHref(page + 1)} className="btn btn-outline btn-sm" rel="next">
          Next →
        </Link>
      ) : (
        <span className="btn btn-outline btn-sm" aria-disabled="true">
          Next →
        </span>
      )}
    </nav>
  );
}

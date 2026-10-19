import Link from "next/link";

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <svg viewBox="0 0 64 64" className="h-14 w-14 text-gold" aria-hidden="true">
        <path
          d="M32 60C20 50 5 33 6 17 7 7 19 3 32 3s25 4 26 14c1 16-14 33-26 43Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
      </svg>
      <h2 className="text-2xl">{title}</h2>
      {children && <div className="max-w-md text-ink-soft">{children}</div>}
      {action && (
        <Link href={action.href} className="btn btn-primary mt-2">
          {action.label}
        </Link>
      )}
    </div>
  );
}

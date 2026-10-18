import Link from "next/link";
import { LogoMark } from "@/components/Logo";

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
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <LogoMark className="h-14 w-14 opacity-80" />
      <h2 className="mt-4 text-xl">{title}</h2>
      {children && <div className="mt-2 max-w-md text-sm text-tan">{children}</div>}
      {action && (
        <Link href={action.href} className="btn btn-primary mt-6">
          {action.label}
        </Link>
      )}
    </div>
  );
}

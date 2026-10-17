import type { ReactNode } from "react";
import { cn } from "./cn";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-ink-500 bg-ink-700/60 p-5 sm:p-6", className)}>{children}</div>;
}

type Tone = "neutral" | "amp" | "ok" | "warn" | "danger" | "info";
const tones: Record<Tone, string> = {
  neutral: "bg-ink-500 text-bone-muted",
  amp: "bg-amp/15 text-amp ring-1 ring-amp/30",
  ok: "bg-green-500/15 text-ok ring-1 ring-green-500/30",
  warn: "bg-yellow-500/15 text-warn ring-1 ring-yellow-500/30",
  danger: "bg-red-500/15 text-danger ring-1 ring-red-500/30",
  info: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30",
};

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

export function Alert({ children, tone = "info", title, className }: { children: ReactNode; tone?: Exclude<Tone, "neutral" | "amp"> | "amp"; title?: string; className?: string }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-lg px-4 py-3 text-sm", tones[tone], className)}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="text-bone-muted [&_a]:text-amp [&_a]:underline">{children}</div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-400 px-6 py-14 text-center">
      <p className="font-display text-xl uppercase tracking-wide text-bone">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-bone-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="border-b border-ink-500 bg-[radial-gradient(ellipse_at_top_right,rgba(255,159,28,0.12),transparent_60%)]">
      <div className="container py-10 sm:py-14">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-amp">{eyebrow}</p>}
        <h1 className="font-display text-4xl uppercase tracking-wide text-bone sm:text-5xl">{title}</h1>
        {children && <div className="mt-4 max-w-2xl text-bone-muted">{children}</div>}
      </div>
    </header>
  );
}

export function SectionHeading({ eyebrow, title, children, className }: { eyebrow?: string; title: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-8", className)}>
      {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-amp">{eyebrow}</p>}
      <h2 className="font-display text-3xl uppercase tracking-wide text-bone sm:text-4xl">{title}</h2>
      {children && <div className="mt-3 max-w-2xl text-bone-muted">{children}</div>}
    </div>
  );
}

export function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  return (
    <span className={cn("inline-flex text-amp", size === "lg" ? "text-xl" : "text-sm")} aria-label={`${rating} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden="true" className={i <= rating ? "" : "text-ink-400"}>★</span>
      ))}
    </span>
  );
}

export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-4 text-bone-muted [&_a]:text-amp [&_a]:underline [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:text-bone [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-bone [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-bone", className)}>
      {children}
    </div>
  );
}

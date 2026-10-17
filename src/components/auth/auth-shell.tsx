import type { ReactNode } from "react";
import { Wordmark } from "../ui/logo";

export function AuthShell({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="container flex justify-center py-14 sm:py-20">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center"><Wordmark size="lg" /></div>
        <div className="rounded-2xl border border-ink-500 bg-ink-800 p-6 sm:p-8">
          <h1 className="mb-6 font-display text-2xl uppercase tracking-wide">{title}</h1>
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-bone-muted">{footer}</div>}
      </div>
    </div>
  );
}

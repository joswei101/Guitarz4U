import { LogoMark } from "@/components/layout/Logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grain flex justify-center bg-cream/60 px-4 py-12 sm:py-16">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="mt-4 text-center text-3xl">{title}</h1>
        {subtitle && <div className="mt-2 text-center text-sm text-ink-soft">{subtitle}</div>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

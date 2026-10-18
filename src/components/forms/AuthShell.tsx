import { LogoMark } from "@/components/Logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grain flex min-h-[70vh] items-center justify-center bg-cream-2 px-4 py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <LogoMark className="mx-auto h-14 w-14" />
        <h1 className="mt-4 text-center text-3xl">{title}</h1>
        {subtitle && <div className="mt-2 text-center text-sm text-tan">{subtitle}</div>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

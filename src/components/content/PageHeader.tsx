export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="on-dark grain bg-deep text-cream">
      <div className="container-page py-12 sm:py-16">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-2 max-w-3xl text-3xl text-cream-light sm:text-5xl">{title}</h1>
        {children && <div className="mt-4 max-w-2xl text-lg text-cream/85">{children}</div>}
      </div>
    </section>
  );
}

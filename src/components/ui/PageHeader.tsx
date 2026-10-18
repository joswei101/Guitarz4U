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
    <section className="grain border-b border-gold/30 bg-cream-2">
      <div className="container-page py-10 md:py-14">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl md:text-5xl">{title}</h1>
        {children && <div className="mt-4 max-w-3xl text-lg text-walnut/85">{children}</div>}
      </div>
    </section>
  );
}

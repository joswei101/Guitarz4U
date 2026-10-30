import Link from 'next/link';

export function PageHero({ title, intro, crumb }: { title: string; intro?: React.ReactNode; crumb?: string }) {
  return (
    <section className="page-hero">
      <div className="wrap">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link> / {crumb ?? title}</nav>
        <h1>{title}</h1>
        {intro ? <p>{intro}</p> : null}
      </div>
    </section>
  );
}

export function DraftNotice({ updated }: { updated?: string }) {
  return (
    <div className="draft-banner" role="note">
      <strong>Draft — awaiting owner review.</strong> This document is a draft prepared for Guitarz4U and has not yet been
      reviewed by a legal professional. It does not constitute legal advice.{updated ? ` Last updated ${updated}.` : ''}
    </div>
  );
}

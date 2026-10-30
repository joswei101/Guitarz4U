import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="section">
      <div className="wrap narrow" style={{ textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/logo-mark.svg" alt="" width={96} height={96} style={{ margin: '0 auto 16px' }} />
        <p className="eyebrow">Error 404</p>
        <h1>That page is out of tune</h1>
        <p className="muted">We couldn&apos;t find the page you were looking for. It may have moved, or the guitar may no longer be listed.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link href="/" className="btn btn-primary">Go home</Link>
          <Link href="/shop" className="btn btn-outline">Browse guitars</Link>
          <Link href="/contact" className="btn btn-outline">Contact us</Link>
        </div>
      </div>
    </div>
  );
}

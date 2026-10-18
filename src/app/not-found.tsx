import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="wrap section center" style={{ maxWidth: 620 }}>
      <LogoMark className="brand-mark" />
      <span className="eyebrow" style={{ marginTop: 16 }}>Error 404</span>
      <h1>This page is out of tune</h1>
      <p className="lead" style={{ margin: "0 auto 24px" }}>We could not find the page you were looking for. The guitar may have been sold, or the link may be incorrect.</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <Link href="/shop" className="btn btn-primary">Browse guitars</Link>
        <Link href="/" className="btn btn-outline">Go to the home page</Link>
        <Link href="/contact" className="btn btn-ghost">Contact us</Link>
      </div>
    </div>
  );
}

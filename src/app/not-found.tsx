import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="grain flex min-h-[60vh] items-center justify-center bg-cream-2 px-4 py-16">
      <div className="max-w-lg text-center">
        <LogoMark className="mx-auto h-20 w-20 -rotate-12" />
        <p className="eyebrow mt-6">Error 404</p>
        <h1 className="mt-2 text-4xl">That page is out of tune</h1>
        <p className="mt-3 text-walnut/80">
          We couldn&apos;t find the page you were looking for. It may have moved, or the item may no longer be listed.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="btn btn-primary">
            Browse the shop
          </Link>
          <Link href="/" className="btn btn-outline">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

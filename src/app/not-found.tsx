import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LogoMark } from "@/components/layout/Logo";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default async function NotFound() {
  const settings = await getSiteSettings();
  return (
    <>
      <Header />
      <main id="main" className="flex-1">
        <section className="container-page flex flex-col items-center py-20 text-center">
          <LogoMark className="h-24 w-24 -rotate-12 opacity-90" />
          <p className="eyebrow mt-6">Error 404</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">This page has gone out of tune</h1>
          <p className="mt-4 max-w-lg text-ink-soft">
            We couldn&apos;t find the page you were looking for. If you followed a link to a guitar, it may have been sold
            or removed from the shop.
          </p>
          <form action="/shop" method="get" role="search" className="mt-8 flex w-full max-w-md gap-2">
            <label htmlFor="nf-search" className="sr-only">
              Search guitars
            </label>
            <input id="nf-search" name="q" type="search" className="input" placeholder="Search guitars…" />
            <button className="btn btn-primary" type="submit">
              Search
            </button>
          </form>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn btn-outline">
              Home
            </Link>
            <Link href="/shop" className="btn btn-outline">
              Shop all guitars
            </Link>
            <Link href="/contact" className="btn btn-outline">
              Contact us
            </Link>
          </div>
        </section>
      </main>
      <Footer contact={settings.contact} />
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon, SearchIcon } from "@/components/ui/Icons";

type Props = {
  links: { href: string; label: string }[];
  signedIn: boolean;
  isAdmin: boolean;
};

export function MobileMenu({ links, signedIn, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState<string | null>(null);
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close when the route changes.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const first = dialogRef.current?.querySelector<HTMLElement>("input, a, button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="xl:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-cream hover:bg-white/10"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
      </button>

      {open && (
        <div
          id="mobile-menu"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-x-0 bottom-0 top-[4.5rem] z-50 overflow-y-auto bg-deep px-5 pb-10 pt-4 animate-fade-up"
        >
          <form action="/shop" method="get" role="search" className="mb-5 flex gap-2">
            <label htmlFor="mobile-search" className="sr-only">
              Search guitars
            </label>
            <input
              id="mobile-search"
              name="q"
              type="search"
              placeholder="Search guitars, brands, models…"
              className="input border-gold/40 bg-walnut text-cream placeholder:text-cream/50"
            />
            <button type="submit" className="btn btn-gold px-4" aria-label="Search">
              <SearchIcon />
            </button>
          </form>
          <nav aria-label="Mobile">
            <ul className="divide-y divide-white/10">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block py-3.5 font-display text-xl text-cream no-underline hover:text-gold-light"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/faq" className="block py-3.5 font-display text-xl text-cream no-underline hover:text-gold-light">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/cart" className="block py-3.5 font-display text-xl text-cream no-underline hover:text-gold-light">
                  Request cart
                </Link>
              </li>
              <li>
                <Link
                  href="/account/wishlist"
                  className="block py-3.5 font-display text-xl text-cream no-underline hover:text-gold-light"
                >
                  Wishlist
                </Link>
              </li>
            </ul>
          </nav>
          <div className="mt-6 flex flex-col gap-3">
            <Link href={signedIn ? "/account" : "/login"} className="btn btn-gold w-full">
              {signedIn ? "My account" : "Sign in or register"}
            </Link>
            {isAdmin && (
              <Link href="/admin" className="btn btn-outline-light w-full">
                Admin dashboard
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

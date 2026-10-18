"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Heart, LayoutDashboard, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";

const iconBtn =
  "relative inline-flex h-11 w-11 items-center justify-center rounded-md text-cream/90 transition-colors hover:bg-white/5 hover:text-gold-light";

export function HeaderActions({ signedIn, isAdmin }: { signedIn: boolean; isAdmin: boolean }) {
  const { count, ready } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <>
      <button type="button" className={iconBtn} aria-label="Search the shop" onClick={() => setSearchOpen(true)}>
        <Search className="h-5 w-5" aria-hidden />
      </button>
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
      <Link href="/account/wishlist" className={`${iconBtn} hidden sm:inline-flex`} aria-label="Wishlist">
        <Heart className="h-5 w-5" aria-hidden />
      </Link>
      <Link href="/cart" className={iconBtn} aria-label={`Request cart, ${count} item${count === 1 ? "" : "s"}`}>
        <ShoppingBag className="h-5 w-5" aria-hidden />
        {ready && count > 0 && (
          <span className="absolute right-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[0.7rem] font-bold text-espresso">
            {count}
          </span>
        )}
      </Link>
      {isAdmin && (
        <Link href="/admin" className={`${iconBtn} hidden sm:inline-flex`} aria-label="Admin dashboard">
          <LayoutDashboard className="h-5 w-5" aria-hidden />
        </Link>
      )}
      <Link
        href={signedIn ? "/account" : "/login"}
        className="ml-1 hidden items-center gap-2 whitespace-nowrap rounded-md border border-gold/60 px-3 py-2 text-sm font-semibold text-cream transition-colors hover:bg-gold hover:text-espresso sm:inline-flex"
      >
        <User className="h-4 w-4" aria-hidden />
        {signedIn ? "My account" : "Sign in"}
      </Link>
    </>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-espresso/70 p-4 pt-24"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onClick={onClose}
    >
      <form
        className="fade-up flex w-full max-w-xl gap-2 rounded-xl bg-ivory p-3 shadow-[var(--shadow-lift)]"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          const q = inputRef.current?.value.trim() ?? "";
          onClose();
          router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
        }}
      >
        <label htmlFor="site-search" className="sr-only">
          Search guitars and equipment
        </label>
        <input
          ref={inputRef}
          id="site-search"
          type="search"
          className="input"
          placeholder="Search brand, model or type…"
          maxLength={80}
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
        <button type="button" className="btn btn-ghost px-3" aria-label="Close search" onClick={onClose}>
          <X className="h-5 w-5" aria-hidden />
        </button>
      </form>
    </div>
  );
}

export function MobileMenu({
  links,
  signedIn,
  isAdmin,
}: {
  links: { href: string; label: string }[];
  signedIn: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="xl:hidden">
      <button
        type="button"
        className={iconBtn}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
      </button>
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-[72px] z-50 overflow-y-auto bg-espresso px-4 pb-10 pt-4">
          <nav aria-label="Mobile">
            <ul className="flex flex-col">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block border-b border-white/10 py-4 font-display text-xl text-cream hover:text-gold-light"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/faq" className="block border-b border-white/10 py-4 font-display text-xl text-cream">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/account/wishlist" className="block border-b border-white/10 py-4 font-display text-xl text-cream">
                  Wishlist
                </Link>
              </li>
              {isAdmin && (
                <li>
                  <Link href="/admin" className="block border-b border-white/10 py-4 font-display text-xl text-gold-light">
                    Admin dashboard
                  </Link>
                </li>
              )}
            </ul>
          </nav>
          <Link href={signedIn ? "/account" : "/login"} className="btn btn-gold mt-6 w-full">
            {signedIn ? "My account" : "Sign in or register"}
          </Link>
        </div>
      )}
    </div>
  );
}

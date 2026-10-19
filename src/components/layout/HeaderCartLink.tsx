"use client";

import Link from "next/link";
import { useCart } from "@/components/shop/CartProvider";
import { CartIcon } from "@/components/ui/Icons";

export function HeaderCartLink() {
  const { items, ready } = useCart();
  const count = ready ? items.length : 0;
  return (
    <Link
      href="/cart"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-cream/90 hover:bg-white/10 hover:text-gold-light"
      aria-label={`Request cart${count ? ` (${count} item${count === 1 ? "" : "s"})` : ""}`}
    >
      <CartIcon />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 min-w-[1.1rem] rounded-full bg-gold px-1 text-center text-[0.65rem] font-bold leading-[1.1rem] text-deep">
          {count}
        </span>
      )}
    </Link>
  );
}

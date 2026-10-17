import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isStaff } from "@/lib/permissions";
import { Wordmark } from "../ui/logo";
import { CartIcon, HeartIcon, SearchIcon, UserIcon } from "./icons";
import { MobileNav } from "./mobile-nav";

export const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/sell", label: "Sell your guitar" },
  { href: "/repairs", label: "Repairs" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/reviews", label: "Reviews" },
  { href: "/contact", label: "Contact" },
];

export async function Header() {
  const user = await getCurrentUser();
  const cartCount = user ? await prisma.cartItem.count({ where: { userId: user.id } }) : 0;
  return (
    <header className="sticky top-0 z-40 border-b border-ink-500 bg-ink-900/90 backdrop-blur supports-[backdrop-filter]:bg-ink-900/75">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-amp focus:px-3 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <div className="container relative flex h-16 items-center justify-between gap-4 lg:h-20">
        <Link href="/" className="shrink-0" aria-label="Guitarz4U home">
          <Wordmark size="md" />
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-6 xl:gap-8">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm font-semibold uppercase tracking-wider text-bone-muted transition-colors hover:text-amp">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/shop" className="hidden rounded-md p-2 text-bone hover:text-amp sm:block" aria-label="Search the shop">
            <SearchIcon className="h-5 w-5" />
          </Link>
          <Link href="/account/wishlist" className="rounded-md p-2 text-bone hover:text-amp" aria-label="Wishlist">
            <HeartIcon className="h-5 w-5" />
          </Link>
          <Link href="/cart" className="relative rounded-md p-2 text-bone hover:text-amp" aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}>
            <CartIcon className="h-5 w-5" />
            {cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-amp px-1 text-[11px] font-bold text-ink">{cartCount}</span>}
          </Link>
          {user ? (
            <Link href={isStaff(user.role) ? "/admin" : "/account"} className="flex items-center gap-2 rounded-md p-2 text-bone hover:text-amp" aria-label={isStaff(user.role) ? "Admin dashboard" : "My account"}>
              <UserIcon className="h-5 w-5" />
              <span className="hidden text-sm font-medium xl:inline">{isStaff(user.role) ? "Dashboard" : user.name.split(" ")[0]}</span>
            </Link>
          ) : (
            <Link href="/login" className="flex items-center gap-2 rounded-md p-2 text-bone hover:text-amp">
              <UserIcon className="h-5 w-5" />
              <span className="hidden text-sm font-medium sm:inline">Sign in</span>
            </Link>
          )}
          <MobileNav links={[...NAV_LINKS, { href: "/faqs", label: "FAQs" }, { href: "/repairs/track", label: "Track a repair" }]} />
        </div>
      </div>
    </header>
  );
}

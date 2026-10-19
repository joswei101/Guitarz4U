import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { HeaderCartLink } from "@/components/layout/HeaderCartLink";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { BellIcon, HeartIcon, SearchIcon, UserIcon } from "@/components/ui/Icons";
import { getProfile, getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/sell", label: "Sell" },
  { href: "/repairs", label: "Repairs" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/reviews", label: "Reviews" },
  { href: "/contact", label: "Contact" },
];

async function getUnreadCount(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

export async function Header({ announcement }: { announcement?: string }) {
  const user = isSupabaseConfigured() ? await getUser() : null;
  const profile = user ? await getProfile() : null;
  const unread = user ? await getUnreadCount(user.id) : 0;
  const isAdmin = profile?.role === "admin";

  return (
    <header className="sticky top-0 z-40 border-b border-gold/30 bg-deep/95 text-cream backdrop-blur supports-[backdrop-filter]:bg-deep/85">
      {announcement && (
        <div className="bg-gold px-4 py-1.5 text-center text-sm font-medium text-deep">{announcement}</div>
      )}
      <div className="container-page flex h-[4.5rem] items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-5 xl:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[0.82rem] font-semibold uppercase tracking-wider text-cream/85 no-underline transition-colors hover:text-gold-light"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/shop#search"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-cream/90 hover:bg-white/10 hover:text-gold-light sm:inline-flex"
            aria-label="Search the shop"
          >
            <SearchIcon />
          </Link>
          <Link
            href="/account/wishlist"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-cream/90 hover:bg-white/10 hover:text-gold-light sm:inline-flex"
            aria-label="Wishlist"
          >
            <HeartIcon />
          </Link>
          {user && (
            <Link
              href={isAdmin ? "/admin/notifications" : "/account/notifications"}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-cream/90 hover:bg-white/10 hover:text-gold-light"
              aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
            >
              <BellIcon />
              {unread > 0 && (
                <span className="absolute right-1 top-1 min-w-[1.1rem] rounded-full bg-gold px-1 text-center text-[0.65rem] font-bold leading-[1.1rem] text-deep">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          )}
          <HeaderCartLink />
          {isAdmin && (
            <Link href="/admin" className="btn btn-gold btn-sm ml-1 hidden md:inline-flex">
              Admin
            </Link>
          )}
          <Link
            href={user ? "/account" : "/login"}
            className="hidden items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-cream/90 no-underline hover:bg-white/10 hover:text-gold-light md:inline-flex"
          >
            <UserIcon />
            <span>{user ? "My account" : "Sign in"}</span>
          </Link>
          <MobileMenu links={NAV_LINKS} signedIn={Boolean(user)} isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  );
}

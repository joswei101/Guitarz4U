"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand } from "./Logo";
import { IconBell, IconCart, IconClose, IconMenu, IconSearch, IconUser } from "./icons";
import { useCart } from "@/lib/cart-store";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/sell", label: "Sell your guitar" },
  { href: "/repairs", label: "Repairs" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/reviews", label: "Reviews" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function HeaderClient({ user, unread }: { user: { name: string; role: string } | null; unread: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const cartIds = useCart();
  useEffect(() => setOpen(false), [pathname]);

  const accountHref = user?.role === "admin" ? "/admin" : user ? "/account" : "/login";
  const notificationsHref = user?.role === "admin" ? "/admin/notifications" : "/account/notifications";
  const isCurrent = (href: string) => (pathname === href || pathname.startsWith(href + "/") ? "page" : undefined);

  return (
    <header className="site-header">
      <div className="wrap header-row">
        <Brand />
        <nav className="main-nav" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isCurrent(n.href)}>{n.label}</Link>
          ))}
        </nav>
        <form className="header-search" action="/shop" role="search">
          <label htmlFor="header-q" className="sr-only">Search guitars</label>
          <input id="header-q" name="q" type="search" placeholder="Search guitars…" />
          <button className="icon-link" type="submit" aria-label="Search"><IconSearch /></button>
        </form>
        <div className="header-tools">
          {user && (
            <Link href={notificationsHref} className="icon-link" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
              <IconBell />
              {unread > 0 && <span className="badge-count">{unread > 99 ? "99+" : unread}</span>}
            </Link>
          )}
          <Link href={accountHref} className="icon-link" aria-label={user ? (user.role === "admin" ? "Admin dashboard" : "My account") : "Log in"}>
            <IconUser /> <span className="label">{user ? (user.role === "admin" ? "Admin" : "Account") : "Log in"}</span>
          </Link>
          <Link href="/cart" className="icon-link" aria-label={`Request cart, ${cartIds.length} item${cartIds.length === 1 ? "" : "s"}`}>
            <IconCart />
            {cartIds.length > 0 && <span className="badge-count" data-testid="cart-count">{cartIds.length}</span>}
          </Link>
          <button
            type="button"
            className="icon-link menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-panel"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>
      <div id="mobile-panel" className="mobile-panel" data-open={open}>
        <div className="wrap">
          <form action="/shop" role="search">
            <label htmlFor="mobile-q" className="sr-only">Search guitars</label>
            <input id="mobile-q" name="q" type="search" placeholder="Search guitars…" />
            <button className="btn btn-gold" type="submit">Search</button>
          </form>
          <nav aria-label="Mobile">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={isCurrent(n.href)}>{n.label}</Link>
            ))}
            <Link href="/faq">FAQ</Link>
            <Link href="/track">Track a request</Link>
            <Link href={accountHref}>{user ? (user.role === "admin" ? "Admin dashboard" : "My account") : "Log in / Register"}</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

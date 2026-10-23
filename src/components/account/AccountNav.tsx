"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/account", label: "Overview" },
  { href: "/account/requests", label: "Purchase requests" },
  { href: "/account/reservations", label: "Reservations" },
  { href: "/account/selling", label: "Selling to us" },
  { href: "/account/repairs", label: "Repairs" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/alerts", label: "Availability alerts" },
  { href: "/account/notifications", label: "Notifications" },
  { href: "/account/profile", label: "Profile & password" },
  { href: "/account/privacy", label: "Privacy & data" },
];

export function AccountNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="mt-4">
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {LINKS.map((l) => {
          const active = l.href === "/account" ? pathname === "/account" : pathname.startsWith(l.href);
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm no-underline ${active ? "bg-walnut text-cream-light" : "text-walnut hover:bg-cream"}`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
        {isAdmin && (
          <li className="shrink-0">
            <Link href="/admin" className="block whitespace-nowrap rounded-md bg-gold px-3 py-2 text-sm font-semibold text-deep no-underline">
              Admin dashboard
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}

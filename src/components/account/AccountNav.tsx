"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/account", label: "Overview" },
  { href: "/account/notifications", label: "Notifications" },
  { href: "/account/requests", label: "Purchase requests" },
  { href: "/account/reservations", label: "Reservations" },
  { href: "/account/submissions", label: "Guitars I'm selling" },
  { href: "/account/repairs", label: "Repairs" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/reviews", label: "My reviews" },
  { href: "/account/profile", label: "Profile & password" },
  { href: "/account/privacy", label: "Privacy & data" },
];

export function AccountNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Account">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {LINKS.map((l) => {
          const active = l.href === "/account" ? pathname === "/account" : pathname.startsWith(l.href);
          return (
            <li key={l.href} className="flex-none">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
                  active ? "bg-walnut text-ivory" : "hover:bg-walnut/5"
                }`}
              >
                {l.label}
                {l.href === "/account/notifications" && unread > 0 && (
                  <span className="rounded-full bg-gold px-2 text-xs font-bold text-espresso">{unread}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MenuIcon, CloseIcon } from "@/components/ui/Icons";

const GROUPS = [
  {
    title: "Business",
    links: [
      { href: "/admin", label: "Overview" },
      { href: "/admin/requests", label: "Purchase requests & EFT" },
      { href: "/admin/reservations", label: "Reservations" },
      { href: "/admin/products", label: "Inventory" },
      { href: "/admin/submissions", label: "Seller submissions & offers" },
      { href: "/admin/repairs", label: "Repair bookings" },
    ],
  },
  {
    title: "People",
    links: [
      { href: "/admin/customers", label: "Customers & privacy" },
      { href: "/admin/reviews", label: "Reviews" },
      { href: "/admin/enquiries", label: "Enquiries" },
      { href: "/admin/notifications", label: "Notifications" },
    ],
  },
  {
    title: "Website",
    links: [
      { href: "/admin/content", label: "Website content" },
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/exports", label: "Exports & backups" },
      { href: "/admin/audit", label: "Audit log" },
    ],
  },
];

export function AdminNav({ badges }: { badges: Record<string, number> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="mx-4 mb-3 flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm lg:hidden"
        aria-expanded={open}
        aria-controls="admin-nav"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <CloseIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />} Admin menu
      </button>
      <nav id="admin-nav" aria-label="Admin" className={`${open ? "block" : "hidden"} px-3 pb-4 lg:block`}>
        {GROUPS.map((g) => (
          <div key={g.title} className="mb-4">
            <p className="px-2 pb-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-gold">{g.title}</p>
            <ul>
              {g.links.map((l) => {
                const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
                const badge = badges[l.href] ?? 0;
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm no-underline ${active ? "bg-gold text-deep" : "text-cream/85 hover:bg-white/10"}`}
                    >
                      {l.label}
                      {badge > 0 && (
                        <span className={`rounded-full px-1.5 text-xs font-bold ${active ? "bg-deep text-cream" : "bg-gold text-deep"}`}>{badge}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}

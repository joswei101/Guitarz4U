"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CloseIcon, MenuIcon } from "./icons";

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-menu" className="rounded-md p-2 text-bone hover:text-amp" aria-label={open ? "Close menu" : "Open menu"}>
        {open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
      </button>
      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="absolute inset-x-0 top-full border-b border-ink-500 bg-ink-900/98 shadow-2xl backdrop-blur">
          <ul className="container flex flex-col py-3">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block border-b border-ink-600 py-3 font-display text-lg uppercase tracking-wider text-bone hover:text-amp">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getProfile, getUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { HeaderActions, MobileMenu } from "./HeaderClient";

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
  const [user, profile, settings] = await Promise.all([getUser(), getProfile(), getSettings()]);
  const isAdmin = profile?.role === "admin";

  return (
    <>
      {settings.announcement && (
        <div className="bg-gold px-4 py-2 text-center text-sm font-medium text-espresso" role="status">
          {settings.announcement}
        </div>
      )}
      <header className="sticky top-0 z-50 border-b border-gold/30 bg-espresso/95 backdrop-blur supports-[backdrop-filter]:bg-espresso/90 print:static">
        <div className="container-page flex h-[72px] items-center justify-between gap-4">
          <Logo />
          <nav aria-label="Main" className="hidden xl:block">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="whitespace-nowrap rounded-md px-2.5 py-2 text-[0.9rem] font-medium text-cream/90 transition-colors hover:bg-white/5 hover:text-gold-light"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-1">
            <HeaderActions signedIn={Boolean(user)} isAdmin={isAdmin} />
            <MobileMenu links={NAV_LINKS} signedIn={Boolean(user)} isAdmin={isAdmin} />
          </div>
        </div>
      </header>
    </>
  );
}

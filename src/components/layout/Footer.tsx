import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { MailIcon, PinIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { whatsappLink } from "@/lib/format";
import type { ContactSettings } from "@/lib/settings";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All guitars" },
      { href: "/shop/category/electric", label: "Electric guitars" },
      { href: "/shop/category/bass", label: "Bass guitars" },
      { href: "/shop/category/acoustic", label: "Acoustic guitars" },
      { href: "/shop/category/classical", label: "Classical guitars" },
    ],
  },
  {
    title: "Services",
    links: [
      { href: "/sell", label: "Sell your guitar" },
      { href: "/repairs", label: "Repairs & setups" },
      { href: "/how-it-works", label: "Buying & selling process" },
      { href: "/reviews", label: "Customer reviews" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Information",
    links: [
      { href: "/about", label: "About Guitarz4U" },
      { href: "/contact", label: "Contact" },
      { href: "/policies", label: "Returns, reservations & condition" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms & conditions" },
    ],
  },
];

export function Footer({ contact }: { contact: ContactSettings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="on-dark mt-20 bg-deep text-cream/85">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-cream/75">
            Pre-owned electric, bass, acoustic and classical guitars, repairs and setups in Johannesburg. Second-hand
            equipment, first-hand service.
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <PinIcon className="h-4 w-4 text-gold" />
              <span>{contact.location_label}</span>
            </li>
            <li className="flex items-center gap-2">
              <WhatsAppIcon className="h-4 w-4 text-gold" />
              <a href={whatsappLink(contact.whatsapp_number)} className="hover:text-gold-light" rel="noopener" target="_blank">
                WhatsApp {contact.whatsapp_display}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MailIcon className="h-4 w-4 text-gold" />
              <a href={`mailto:${contact.email}`} className="break-all hover:text-gold-light">
                {contact.email}
              </a>
            </li>
            <li className="pl-6 font-semibold text-gold-light">{contact.hours_notice}</li>
          </ul>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-gold-light">{col.title}</h2>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-cream/80 no-underline hover:text-gold-light">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-cream/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} Guitarz4U. Online purchase requests only — no online payments are processed on this website.
          </p>
          <p>
            Social: @{contact.social_handle}
            {contact.social_links.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="ml-3 hover:text-gold-light">
                {s.label}
              </a>
            ))}
          </p>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { Mail } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { getSettings } from "@/lib/settings";
import { displayPhone, whatsappLink } from "@/lib/whatsapp";
import { BUSINESS } from "@/lib/constants";

const groups = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All guitars & equipment" },
      { href: "/shop?category=electric-guitars", label: "Electric guitars" },
      { href: "/shop?category=bass-guitars", label: "Bass guitars" },
      { href: "/shop?category=acoustic-guitars", label: "Acoustic guitars" },
      { href: "/shop?category=classical-guitars", label: "Classical guitars" },
      { href: "/shop?availability=sold", label: "Recently sold" },
    ],
  },
  {
    title: "Services",
    links: [
      { href: "/sell", label: "Sell your guitar" },
      { href: "/repairs", label: "Guitar repairs" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/reviews", label: "Customer reviews" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Information",
    links: [
      { href: "/about", label: "About Guitarz4U" },
      { href: "/contact", label: "Contact" },
      { href: "/policies/privacy", label: "Privacy policy" },
      { href: "/policies/terms", label: "Terms & conditions" },
      { href: "/policies/returns", label: "Returns, condition & reservations" },
    ],
  },
];

export async function Footer() {
  const s = await getSettings();
  return (
    <footer className="mt-auto bg-espresso text-cream/85 print:hidden">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <LogoMark className="h-12 w-12" />
            <div>
              <p className="font-display text-2xl text-ivory">
                Guitarz<span className="text-gold">4</span>U
              </p>
              <p className="text-sm text-gold-light">{BUSINESS.tagline}</p>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            Pre-owned guitars given a new life, with honest descriptions and friendly, personal service. Based in{" "}
            {BUSINESS.location}, {BUSINESS.region}.
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            <li>
              <a
                className="inline-flex items-center gap-2 hover:text-gold-light"
                href={whatsappLink(s.whatsapp_number)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp {displayPhone(s.whatsapp_number)}
              </a>
            </li>
            <li>
              <a className="inline-flex items-center gap-2 hover:text-gold-light" href={`mailto:${s.contact_email}`}>
                <Mail className="h-4 w-4" aria-hidden /> {s.contact_email}
              </a>
            </li>
            <li className="text-cream/70">Social: @{s.social_handle}</li>
            <li className="font-semibold text-gold-light">{s.closed_notice}</li>
          </ul>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <h2 className="font-display text-lg text-ivory">{g.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-gold-light">
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
          <p>© {new Date().getFullYear()} Guitarz4U. All prices in South African rand (ZAR).</p>
          <p>No online payments are taken on this website. Purchases are arranged directly with Guitarz4U.</p>
        </div>
      </div>
    </footer>
  );
}

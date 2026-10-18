import Link from "next/link";
import { mailtoLink, site, whatsappLink } from "@/lib/site";
import { Wordmark } from "../ui/logo";
import { NewsletterForm } from "../forms/newsletter-form";
import { MailIcon, PinIcon, WhatsAppIcon } from "./icons";
import { WhatsAppFloatGate } from "./whatsapp-gate";

const cols = [
  { title: "Shop", links: [["/shop", "All guitars & gear"], ["/shop?category=electric-guitars", "Electric guitars"], ["/shop?category=bass-guitars", "Bass guitars"], ["/shop?category=acoustic-guitars", "Acoustic guitars"], ["/shop?category=amplifiers", "Amplifiers"], ["/shop?category=parts", "Selected parts"]] },
  { title: "Services", links: [["/sell", "Sell your guitar"], ["/repairs", "Guitar repairs"], ["/repairs/book", "Book a repair"], ["/repairs/track", "Track a repair"], ["/how-it-works", "Buying & selling process"]] },
  { title: "Help", links: [["/about", "About us"], ["/reviews", "Customer reviews"], ["/faqs", "FAQs"], ["/contact", "Contact"], ["/account", "My account"]] },
  { title: "Policies", links: [["/policies/privacy", "Privacy policy"], ["/policies/terms", "Terms & conditions"], ["/policies/returns", "Returns, refunds & cancellations"], ["/policies/condition", "Used-gear condition disclosure"], ["/policies/repair-terms", "Repair terms & warranty"], ["/policies/collection", "Collection-only policy"]] },
] as const;

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink-500 bg-ink-800">
      <div className="container grid gap-12 py-14 lg:grid-cols-[1.2fr_2fr]">
        <div className="space-y-5">
          <Wordmark size="lg" />
          <p className="font-display text-lg uppercase tracking-widest text-amp">{site.tagline}</p>
          <ul className="space-y-2 text-sm text-bone-muted">
            <li className="flex items-center gap-2"><PinIcon className="h-4 w-4 text-amp" /> {site.area} · collection only</li>
            <li><a href={whatsappLink("Hi Guitarz4U!")} className="flex items-center gap-2 hover:text-amp" target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="h-4 w-4 text-amp" /> WhatsApp {site.whatsappDisplay}</a></li>
            <li><a href={mailtoLink()} className="flex items-center gap-2 break-all hover:text-amp"><MailIcon className="h-4 w-4 shrink-0 text-amp" /> {site.email}</a></li>
            <li className="text-bone-dim">Social: @{site.socialHandle}</li>
            <li className="font-semibold text-bone">{site.hoursNote}</li>
          </ul>
          <div className="pt-2">
            <p className="mb-2 text-sm font-semibold text-bone">New stock alerts</p>
            <NewsletterForm idPrefix="footer-nl" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="mb-3 font-display text-sm uppercase tracking-[0.2em] text-bone">{c.title}</p>
              <ul className="space-y-2 text-sm">
                {c.links.map(([href, label]) => (
                  <li key={href}><Link href={href} className="text-bone-muted hover:text-amp">{label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-ink-500">
        <div className="container flex flex-col gap-2 py-5 text-xs text-bone-dim sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}. All prices in South African rand (ZAR). Card payments processed securely by PayFast.</p>
          <p>Second-hand instruments are sold as described. See our <Link href="/policies/condition" className="underline hover:text-amp">condition disclosure</Link>.</p>
        </div>
      </div>
    </footer>
  );
}

export function WhatsAppFloat() {
  return (
    <WhatsAppFloatGate>
    <a href={whatsappLink("Hi Guitarz4U, I have a question:")} target="_blank" rel="noopener noreferrer" aria-label={`Chat with Guitarz4U on WhatsApp (${site.whatsappDisplay})`} className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/40 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amp">
      <WhatsAppIcon className="h-7 w-7" />
    </a>
    </WhatsAppFloatGate>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/content/PageHeader";
import { RepairForm } from "@/components/forms/RepairForm";
import { WhatsAppIcon, WrenchIcon } from "@/components/ui/Icons";
import { getProfile, getUser } from "@/lib/auth";
import { getCategories } from "@/lib/data/products";
import { getSiteSettings } from "@/lib/settings";
import { tomorrowISODate, whatsappLink } from "@/lib/format";
import { REPAIR_SERVICES } from "@/lib/constants";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = {
  title: "Guitar repairs and setups in Johannesburg",
  description:
    "Guitar string replacement, setups, electronics, hardware, body repairs and fretwork in Sandringham, Johannesburg. Every repair assessed and quoted personally.",
  alternates: { canonical: "/repairs" },
};

export default async function RepairsPage() {
  const [user, profile, categories, settings] = await Promise.all([getUser(), getProfile(), getCategories(), getSiteSettings()]);
  const minDate = tomorrowISODate();
  const prices = settings.repair_prices.show ? settings.repair_prices.items : [];

  return (
    <>
      <PageHeader eyebrow="Repairs & setups" title="Guitar repairs and setups">
        <p>From fresh strings to electronics, hardware, body work and frets — every job is assessed and quoted personally before work begins.</p>
      </PageHeader>

      <section className="container-page py-12" aria-labelledby="services-heading">
        <h2 id="services-heading" className="text-3xl">
          What we can help with
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REPAIR_SERVICES.map((s) => {
            const price = prices.find((p) => p.service === s.id)?.price;
            return (
              <li key={s.id} className="card p-5">
                <WrenchIcon className="h-6 w-6 text-gold" />
                <h3 className="mt-3 text-lg">{s.name}</h3>
                <p className="mt-1 text-sm text-ink-soft">{s.description}</p>
                <p className="mt-3 text-sm font-semibold text-walnut">{price ? price : "Quoted after assessment"}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="container-page grid gap-10 pb-12 lg:grid-cols-[1fr_22rem]" id="book">
        <section className="card p-6 sm:p-8" aria-labelledby="book-heading">
          <h2 id="book-heading" className="text-2xl">
            Book a repair assessment
          </h2>
          {user ? (
            <div className="mt-6">
              <RepairForm
                userId={user.id}
                categories={categories}
                minDate={minDate}
                defaults={{ name: profile?.full_name, email: profile?.email, phone: profile?.phone, preferred: profile?.preferred_contact }}
              />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-ink-soft">Please sign in or create a free account so you can track your repair and respond to quotes.</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/login?next=/repairs%23book" className="btn btn-primary">
                  Sign in
                </Link>
                <Link href="/register?next=/repairs%23book" className="btn btn-outline">
                  Create an account
                </Link>
              </div>
            </div>
          )}
        </section>
        <aside className="space-y-4">
          <div className="card p-5 text-sm">
            <h2 className="text-lg">How repairs work</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink-soft">
              <li>Submit a booking request with photos.</li>
              <li>We review it and may ask questions.</li>
              <li>We send you a quote in your account.</li>
              <li>You accept or decline the quote.</li>
              <li>We confirm the booking — only then does work begin.</li>
            </ol>
          </div>
          <p className="notice text-sm">{settings.contact.hours_notice}. Drop-off and collection are arranged privately.</p>
          <a href={whatsappLink(settings.contact.whatsapp_number, "Hi Guitarz4U, I'd like to ask about a guitar repair.")} target="_blank" rel="noopener" className="btn btn-whatsapp w-full">
            <WhatsAppIcon /> Ask about a repair on WhatsApp
          </a>
        </aside>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "Guitar repair and setup",
          provider: { "@type": "MusicStore", name: "Guitarz4U", url: SITE_URL },
          areaServed: { "@type": "City", name: "Johannesburg" },
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Guitar repairs",
            itemListElement: REPAIR_SERVICES.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.name } })),
          },
        }}
      />
    </>
  );
}

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteSettings } from "@/lib/settings";
import { SITE_URL } from "@/lib/env";
import { BUSINESS } from "@/lib/constants";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const announcement = settings.announcement.enabled ? settings.announcement.text : undefined;

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header announcement={announcement} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer contact={settings.contact} />
      <WhatsAppButton number={settings.contact.whatsapp_number} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "MusicStore",
          name: BUSINESS.name,
          slogan: BUSINESS.tagline,
          url: SITE_URL,
          logo: `${SITE_URL}/images/icon-512.png`,
          email: settings.contact.email,
          telephone: "+" + settings.contact.whatsapp_number,
          currenciesAccepted: "ZAR",
          paymentAccepted: "EFT (arranged privately after approval)",
          areaServed: ["Johannesburg", "Gauteng", "South Africa"],
          // Locality only: the exact address is deliberately never published.
          address: {
            "@type": "PostalAddress",
            addressLocality: `${BUSINESS.locality}, ${BUSINESS.city}`,
            addressRegion: BUSINESS.region,
            addressCountry: "ZA",
          },
        }}
      />
    </>
  );
}

import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { mailtoLink, site, whatsappLink } from "@/lib/site";
import { Card, PageHeader } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { ContactForm } from "@/components/forms/contact-form";
import { MailIcon, PinIcon, WhatsAppIcon } from "@/components/layout/icons";

export const metadata: Metadata = { title: "Contact Guitarz4U", description: "WhatsApp, email or message Guitarz4U in Sandringham, Johannesburg.", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const user = await getCurrentUser();
  return (
    <>
      <PageHeader eyebrow="Get in touch" title="Contact">Questions about gear, selling or a repair? WhatsApp is usually quickest.</PageHeader>
      <div className="container grid gap-8 py-10 lg:grid-cols-[1fr_380px]">
        <Card><ContactForm defaults={user ? { name: user.name, email: user.email } : undefined} /></Card>
        <div className="space-y-4">
          <a href={whatsappLink("Hi Guitarz4U!")} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg", "w-full")}><WhatsAppIcon className="h-5 w-5" /> WhatsApp {site.whatsappDisplay}</a>
          <a href={mailtoLink("Enquiry")} className={buttonClass("outline", "lg", "w-full")}><MailIcon className="h-5 w-5" /> {site.email}</a>
          <Card className="space-y-2 text-sm text-bone-muted">
            <p className="flex items-center gap-2 text-bone"><PinIcon className="h-4 w-4 text-amp" /> {site.area}</p>
            <p>We&apos;re collection only. The exact address is shared privately once a purchase or repair drop-off is confirmed.</p>
            <p className="font-semibold text-bone">{site.hoursNote}</p>
            <p>Social: @{site.socialHandle}</p>
          </Card>
        </div>
      </div>
    </>
  );
}

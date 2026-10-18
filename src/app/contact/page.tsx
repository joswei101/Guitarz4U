import type { Metadata } from "next";
import { Mail, MapPin, Clock, AtSign } from "lucide-react";
import { getProfile, getUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { ContactForm } from "@/components/forms/ContactForm";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { displayPhone, whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contact Guitarz4U",
  description: "Contact Guitarz4U on WhatsApp (064 856 7019) or email about second-hand guitars, selling your guitar or repairs in Johannesburg.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const [s, user, profile] = await Promise.all([getSettings(), getUser(), getProfile()]);
  return (
    <>
      <PageHeader eyebrow="Contact" title="Get in touch">
        WhatsApp is the quickest way to reach us. You can also email us or use the form below.
      </PageHeader>
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <a href={whatsappLink(s.whatsapp_number, "Hi Guitarz4U!")} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-4 p-5 hover:border-gold">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1f7a4d] text-white">
              <WhatsAppIcon className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-semibold">WhatsApp</span>
              <span className="text-tan">{displayPhone(s.whatsapp_number)}</span>
            </span>
          </a>
          <a href={`mailto:${s.contact_email}`} className="card flex items-center gap-4 p-5 hover:border-gold">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-walnut text-gold-light">
              <Mail className="h-6 w-6" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">Email</span>
              <span className="break-all text-tan">{s.contact_email}</span>
            </span>
          </a>
          <div className="card space-y-3 p-5 text-sm">
            <p className="flex gap-3">
              <MapPin className="h-5 w-5 flex-none text-gold" aria-hidden /> Sandringham, Johannesburg. Our address is
              shared privately once a purchase or appointment has been arranged.
            </p>
            <p className="flex gap-3 font-semibold">
              <Clock className="h-5 w-5 flex-none text-gold" aria-hidden /> {s.closed_notice}
            </p>
            <p className="flex gap-3">
              <AtSign className="h-5 w-5 flex-none text-gold" aria-hidden /> Social media: @{s.social_handle}
            </p>
          </div>
        </aside>
        <section className="card p-6 sm:p-8" aria-labelledby="contact-form-h">
          <h2 id="contact-form-h" className="text-2xl">
            Send us a message
          </h2>
          <div className="mt-5">
            <ContactForm defaults={{ name: profile?.full_name, email: user?.email, phone: profile?.phone }} />
          </div>
        </section>
      </div>
    </>
  );
}

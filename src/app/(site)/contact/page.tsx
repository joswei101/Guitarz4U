import type { Metadata } from "next";
import { PageHeader } from "@/components/content/PageHeader";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { MailIcon, PinIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { getSiteSettings } from "@/lib/settings";
import { getProfile } from "@/lib/auth";
import { whatsappLink } from "@/lib/format";
import { COLLECTION_PRIVACY_NOTICE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact Guitarz4U",
  description:
    "Contact Guitarz4U in Sandringham, Johannesburg, about second-hand guitars, selling your guitar or repairs. WhatsApp 064 856 7019.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const [settings, profile] = await Promise.all([getSiteSettings(), getProfile()]);
  const c = settings.contact;
  return (
    <>
      <PageHeader eyebrow="Get in touch" title="Contact Guitarz4U">
        <p>WhatsApp is usually the quickest way to reach us. You can also email us or use the form below.</p>
      </PageHeader>
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[22rem_1fr]">
        <aside className="space-y-4">
          <a
            href={whatsappLink(c.whatsapp_number, "Hi Guitarz4U, I have a question.")}
            target="_blank"
            rel="noopener"
            className="card flex items-center gap-4 p-5 no-underline hover:shadow-[var(--shadow-lift)]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1f7a4a] text-white">
              <WhatsAppIcon className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-sm text-ink-soft">WhatsApp</span>
              <span className="font-display text-xl text-walnut">{c.whatsapp_display}</span>
            </span>
          </a>
          <a href={`mailto:${c.email}`} className="card flex items-center gap-4 p-5 no-underline hover:shadow-[var(--shadow-lift)]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-walnut text-cream">
              <MailIcon className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm text-ink-soft">Email</span>
              <span className="block break-all font-semibold text-walnut">{c.email}</span>
            </span>
          </a>
          <div className="card flex items-start gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cream text-walnut">
              <PinIcon className="h-6 w-6" />
            </span>
            <div className="text-sm">
              <p className="font-semibold text-walnut">{c.location_label}</p>
              <p className="mt-1 text-ink-soft">{COLLECTION_PRIVACY_NOTICE}</p>
              <p className="mt-2 font-semibold text-walnut">{c.hours_notice}</p>
            </div>
          </div>
          <div className="card p-5 text-sm">
            <p className="font-semibold text-walnut">Social media</p>
            <p className="text-ink-soft">@{c.social_handle}</p>
          </div>
        </aside>
        <section className="card p-6 sm:p-8" aria-labelledby="form-heading">
          <h2 id="form-heading" className="text-2xl">
            Send us a message
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            We&apos;ll reply on your preferred channel. Please don&apos;t send banking or card details.
          </p>
          <div className="mt-6">
            <EnquiryForm
              defaults={{ name: profile?.full_name ?? "", email: profile?.email ?? "", phone: profile?.phone ?? "" }}
            />
          </div>
        </section>
      </div>
    </>
  );
}

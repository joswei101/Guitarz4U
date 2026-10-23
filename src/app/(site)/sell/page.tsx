import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/content/PageHeader";
import { SellForm } from "@/components/forms/SellForm";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { getProfile, getUser } from "@/lib/auth";
import { getCategories } from "@/lib/data/products";
import { getSiteSettings } from "@/lib/settings";
import { whatsappLink } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sell your guitar in Johannesburg",
  description:
    "Sell your electric, bass, acoustic or classical guitar to Guitarz4U — working, broken or incomplete. Send photos and details for a personal review.",
  alternates: { canonical: "/sell" },
};

export default async function SellPage() {
  const [user, profile, categories, settings] = await Promise.all([getUser(), getProfile(), getCategories(), getSiteSettings()]);
  return (
    <>
      <PageHeader eyebrow="Sell to Guitarz4U" title="Sell your guitar">
        <p>
          Working, broken or incomplete — we&apos;re interested in electric, bass, acoustic and classical guitars. Tell us about
          yours and we&apos;ll review it personally.
        </p>
      </PageHeader>
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_22rem]">
        <section className="card p-6 sm:p-8" aria-labelledby="sell-form-heading">
          <h2 id="sell-form-heading" className="text-2xl">
            Tell us about your guitar
          </h2>
          {user ? (
            <div className="mt-6">
              <SellForm userId={user.id} categories={categories} defaults={{ name: profile?.full_name, phone: profile?.phone, email: profile?.email }} />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-ink-soft">
                Please sign in or create a free account so you can upload photos privately, track your submission and respond to
                any offer. Prefer not to? Send your details on WhatsApp instead.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/login?next=/sell" className="btn btn-primary">
                  Sign in
                </Link>
                <Link href="/register?next=/sell" className="btn btn-outline">
                  Create an account
                </Link>
              </div>
            </div>
          )}
        </section>
        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="text-lg">How it works</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-soft">
              <li>Send us details and photographs.</li>
              <li>We review every guitar personally.</li>
              <li>We may ask for more information, decline, or make you an offer.</li>
              <li>Accept or decline the offer in your account.</li>
              <li>If you accept, we arrange the next steps privately.</li>
            </ol>
          </div>
          <div className="notice text-sm">
            We decide which guitars to buy and what to offer after reviewing them. Submitting a guitar is never a promise to buy it.
            We don&apos;t buy loose guitar parts on their own.
          </div>
          <a
            href={whatsappLink(settings.contact.whatsapp_number, "Hi Guitarz4U, I'd like to sell a guitar. Brand/model: ... Condition: ... Does it work: ...")}
            target="_blank"
            rel="noopener"
            className="btn btn-whatsapp w-full"
          >
            <WhatsAppIcon /> Submit via WhatsApp instead
          </a>
        </aside>
      </div>
    </>
  );
}

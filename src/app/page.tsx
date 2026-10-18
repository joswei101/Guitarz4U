import Link from "next/link";
import { prisma } from "@/lib/db";
import { productCardSelect } from "@/lib/catalog";
import { publicProductWhere } from "@/lib/shop/inventory";
import { mailtoLink, site, whatsappLink } from "@/lib/site";
import { ProductGrid } from "@/components/shop/product-card";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Card, EmptyState, SectionHeading, Stars } from "@/components/ui/misc";
import { Wordmark } from "@/components/ui/logo";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { ChatIcon, MailIcon, ShieldIcon, TagIcon, WhatsAppIcon, WrenchIcon } from "@/components/layout/icons";
import { REPAIR_SERVICES } from "@/lib/repairs/status";
import { JsonLd } from "@/components/json-ld";

export default async function HomePage() {
  const [banner, featured, recent, categories, reviews] = await Promise.all([
    prisma.banner.findFirst({ where: { status: "PUBLISHED" }, orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({ where: { ...publicProductWhere, isFeatured: true }, select: productCardSelect, orderBy: { publishedAt: "desc" }, take: 4 }),
    prisma.product.findMany({ where: publicProductWhere, select: productCardSelect, orderBy: { publishedAt: "desc" }, take: 8 }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: { where: publicProductWhere } } } } }),
    prisma.review.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 3, include: { product: { select: { title: true } } } }),
  ]);

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "MusicStore", name: site.name, slogan: site.tagline, description: site.description, email: site.email, telephone: "+27648567019", address: { "@type": "PostalAddress", addressLocality: "Sandringham, Johannesburg", addressCountry: "ZA" }, currenciesAccepted: "ZAR", paymentAccepted: "Credit Card, Debit Card" }} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-ink-500">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero.webp" alt="" aria-hidden="true" fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-45" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-transparent to-transparent" />
        <div className="container py-20 sm:py-28 lg:py-36">
          <div className="max-w-2xl animate-fade-up">
            <Wordmark size="xl" />
            <h1 className="mt-6 font-display text-3xl uppercase leading-tight tracking-wide text-bone sm:text-5xl">
              {banner?.heading ?? site.tagline}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-bone-muted">{banner?.subheading ?? site.description}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/shop" size="lg">Shop Guitars</ButtonLink>
              <ButtonLink href="/sell" size="lg" variant="outline">Sell Your Guitar</ButtonLink>
              <ButtonLink href="/repairs/book" size="lg" variant="outline">Book a Repair</ButtonLink>
            </div>
            <p className="mt-6 text-sm text-bone-dim">{site.area} · Collection only · {site.hoursNote}</p>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="container py-16 sm:py-20" aria-labelledby="featured-h">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Hand-picked" title="Featured gear" className="mb-0" />
          <Link href="/shop" className="link text-sm font-semibold">View all →</Link>
        </div>
        <div className="mt-8">
          {featured.length ? <ProductGrid products={featured} /> : <EmptyState title="New stock is on its way">Featured instruments will appear here as soon as they're listed. Follow us or join the newsletter to hear first.</EmptyState>}
        </div>
      </section>

      {/* Categories */}
      <section className="border-y border-ink-500 bg-ink-800 py-16 sm:py-20 stage-grain" aria-labelledby="cats-h">
        <div className="container">
          <SectionHeading eyebrow="Browse" title="Shop by category" />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/shop?category=${c.slug}`} className="group flex h-full flex-col justify-between rounded-xl border border-ink-500 bg-ink-700/60 p-4 transition hover:border-amp">
                  <span className="font-display text-lg uppercase leading-tight tracking-wide text-bone group-hover:text-amp">{c.name}</span>
                  <span className="mt-3 text-xs text-bone-dim">{c._count.products} available</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/shop?category=left-handed" className="group flex h-full flex-col justify-between rounded-xl border border-ink-500 bg-ink-700/60 p-4 transition hover:border-amp">
                <span className="font-display text-lg uppercase leading-tight tracking-wide text-bone group-hover:text-amp">Left-handed guitars</span>
                <span className="mt-3 text-xs text-bone-dim">Lefty-friendly picks</span>
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* Recently added */}
      <section className="container py-16 sm:py-20" aria-labelledby="recent-h">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Just in" title="Recently added" className="mb-0" />
          <Link href="/shop?sort=newest" className="link text-sm font-semibold">See everything new →</Link>
        </div>
        <div className="mt-8">
          {recent.length ? <ProductGrid products={recent} /> : <EmptyState title="The shop is being stocked">Check back soon, or tell us what you're looking for on WhatsApp.</EmptyState>}
        </div>
      </section>

      {/* Repairs */}
      <section className="border-y border-ink-500 bg-gradient-to-br from-ink-800 to-ink py-16 sm:py-20" aria-labelledby="repairs-h">
        <div className="container grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <div>
            <SectionHeading eyebrow="Workshop" title="Guitar & amp repairs">
              Electric, bass, acoustic, classical and electro-acoustic guitars plus guitar amplifiers. Every job is inspected and quoted before any work starts — and you only pay once the repair is done.
            </SectionHeading>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/repairs/book">Request an assessment</ButtonLink>
              <ButtonLink href="/repairs" variant="outline">See all services</ButtonLink>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {REPAIR_SERVICES.slice(0, 12).map((s) => (
              <li key={s} className="flex items-center gap-3 rounded-lg border border-ink-500 bg-ink-700/40 px-4 py-3 text-sm text-bone">
                <WrenchIcon className="h-4 w-4 shrink-0 text-amp" /> {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Selling */}
      <section className="container py-16 sm:py-20" aria-labelledby="sell-h">
        <SectionHeading eyebrow="Sell to us" title="Got a guitar gathering dust?">
          We buy used, broken and incomplete guitars and selected equipment. No asking price needed — just tell us about it.
        </SectionHeading>
        <ol className="grid gap-4 md:grid-cols-4">
          {[
            ["Submit", "Send photos and a description of the item and any faults."],
            ["Review", "The owner personally reviews every submission."],
            ["Offer", "Get a no-obligation offer. Counter-offers welcome."],
            ["Get paid", "Agree a price, arrange a private handover and get paid."],
          ].map(([t, d], i) => (
            <li key={t} className="relative rounded-xl border border-ink-500 bg-ink-700/40 p-5">
              <span className="font-display text-5xl text-amp/80">0{i + 1}</span>
              <p className="mt-2 font-display text-xl uppercase tracking-wide text-bone">{t}</p>
              <p className="mt-1 text-sm text-bone-muted">{d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8"><ButtonLink href="/sell" size="lg">Sell your guitar</ButtonLink></div>
      </section>

      {/* Why */}
      <section className="border-y border-ink-500 bg-ink-800 py-16 sm:py-20 stage-grain" aria-labelledby="why-h">
        <div className="container">
          <SectionHeading eyebrow="Why Guitarz4U" title="Second-hand gear, first-hand service" />
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: ShieldIcon, t: "Honest condition ratings", d: "Every item is inspected, rated and photographed as-is. Known faults are disclosed up front." },
              { icon: WrenchIcon, t: "Played and set up by a musician", d: "Owner-run by a working guitarist who repairs and sets up instruments personally." },
              { icon: TagIcon, t: "Secure card checkout", d: "Pay safely by card via PayFast. Your card details never touch our servers." },
            ].map(({ icon: Icon, t, d }) => (
              <Card key={t}>
                <Icon className="h-8 w-8 text-amp" />
                <p className="mt-4 font-display text-xl uppercase tracking-wide text-bone">{t}</p>
                <p className="mt-2 text-sm text-bone-muted">{d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="container py-16 sm:py-20" aria-labelledby="reviews-h">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Customers" title="What customers say" className="mb-0" />
          <Link href="/reviews" className="link text-sm font-semibold">All reviews →</Link>
        </div>
        <div className="mt-8">
          {reviews.length ? (
            <div className="grid gap-5 md:grid-cols-3">
              {reviews.map((r) => (
                <Card key={r.id}>
                  <Stars rating={r.rating} />
                  {r.title && <p className="mt-3 font-semibold text-bone">{r.title}</p>}
                  <p className="mt-2 line-clamp-5 text-sm text-bone-muted">“{r.body}”</p>
                  <p className="mt-4 text-xs text-bone-dim">— {r.displayName}{r.product ? ` · ${r.product.title}` : ""}{r.isVerifiedPurchase ? " · Verified purchase" : ""}</p>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No reviews yet" action={<ButtonLink href="/reviews#write" variant="outline">Write a review</ButtonLink>}>
              We only publish genuine reviews from registered customers, after they've been checked. Bought or repaired something with us? We'd love to hear from you.
            </EmptyState>
          )}
        </div>
      </section>

      {/* Contact + newsletter */}
      <section className="container" aria-labelledby="contact-h">
        <div className="grid gap-6 rounded-2xl border border-amp/30 bg-[radial-gradient(ellipse_at_top_left,rgba(255,159,28,0.15),transparent_60%)] p-6 sm:p-10 lg:grid-cols-2">
          <div>
            <h2 id="contact-h" className="font-display text-3xl uppercase tracking-wide text-bone">Talk to a human</h2>
            <p className="mt-3 text-bone-muted">Questions about a guitar, a repair or selling? Message the owner directly. {site.hoursNote}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={whatsappLink("Hi Guitarz4U!")} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg")}><WhatsAppIcon className="h-5 w-5" /> WhatsApp {site.whatsappDisplay}</a>
              <a href={mailtoLink("Enquiry from the Guitarz4U website")} className={buttonClass("outline", "lg")}><MailIcon className="h-5 w-5" /> Email us</a>
              <Link href="/contact" className={buttonClass("ghost", "lg")}><ChatIcon className="h-5 w-5" /> Contact form</Link>
            </div>
          </div>
          <div>
            <h2 className="font-display text-2xl uppercase tracking-wide text-bone">Hear about new stock first</h2>
            <p className="mb-4 mt-2 text-sm text-bone-muted">Occasional emails when interesting gear comes in. No spam.</p>
            <NewsletterForm idPrefix="home-nl" />
          </div>
        </div>
      </section>
    </>
  );
}

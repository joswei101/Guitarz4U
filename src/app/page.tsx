/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, BadgeCheck, Handshake, MessageCircle, Search, ShieldCheck, Wrench } from "lucide-react";
import { getCategories, searchProducts } from "@/lib/data/products";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { ProductGrid } from "@/components/shop/ProductCard";
import { HERO_DEFAULT, HOW_IT_WORKS } from "@/content/copy";
import { publicImageUrl } from "@/lib/images";
import { whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Stars } from "@/components/ui/Stars";
import { RecentlyViewed } from "@/components/shop/RecentlyViewed";
import { SITE_URL } from "@/lib/env";
import { BUSINESS } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export default async function HomePage() {
  const supabase = await createClient();
  const [settings, featured, newest, categories, reviewsRes] = await Promise.all([
    getSettings(),
    searchProducts({ featuredOnly: true, perPage: 4 }),
    searchProducts({ perPage: 8 }),
    getCategories(),
    supabase.from("public_reviews").select("*").order("created_at", { ascending: false }).limit(3),
  ]);
  const reviews = reviewsRes.data ?? [];
  const showcase = featured.products.length ? featured.products : newest.products.slice(0, 4);
  const showcaseIds = new Set(showcase.map((p) => p.id));
  const latest = newest.products.filter((p) => !showcaseIds.has(p.id)).slice(0, 4);
  const heroImage = publicImageUrl(settings.hero_image_path, "site-assets") ?? "/hero-guitar.svg";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicStore",
    name: BUSINESS.name,
    slogan: BUSINESS.tagline,
    url: SITE_URL,
    email: settings.contact_email,
    telephone: "+27" + settings.whatsapp_number.replace(/\D/g, "").replace(/^0/, ""),
    areaServed: ["Johannesburg", "Gauteng", "South Africa"],
    address: { "@type": "PostalAddress", addressLocality: "Johannesburg", addressRegion: "Gauteng", addressCountry: "ZA" },
    currenciesAccepted: "ZAR",
    paymentAccepted: "EFT",
    description: "Second-hand guitars bought, sold and repaired in Johannesburg.",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-espresso text-cream">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ background: "radial-gradient(60% 80% at 80% 40%, #4a3529 0%, transparent 70%)" }}
          aria-hidden
        />
        <div className="container-page relative grid items-center gap-10 py-12 md:grid-cols-[1.1fr_0.9fr] md:py-16">
          <div className="fade-up">
            <p className="eyebrow !text-gold-light">Johannesburg · Second-hand guitar specialists</p>
            <h1 className="mt-4 text-4xl text-ivory sm:text-5xl lg:text-6xl">{settings.hero_title || HERO_DEFAULT.title}</h1>
            <p className="mt-5 max-w-xl text-lg text-cream/85">{settings.hero_subtitle || HERO_DEFAULT.subtitle}</p>
            <form action="/shop" className="mt-7 flex max-w-lg gap-2" role="search">
              <label htmlFor="hero-search" className="sr-only">
                Search guitars
              </label>
              <input
                id="hero-search"
                name="q"
                type="search"
                placeholder="Search e.g. Fender, bass, acoustic…"
                className="input !border-gold/50 !bg-ivory"
                maxLength={80}
              />
              <button className="btn btn-gold" type="submit" aria-label="Search">
                <Search className="h-5 w-5" aria-hidden />
              </button>
            </form>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/shop" className="btn btn-gold">
                Shop guitars <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/sell" className="btn btn-outline-light">
                Sell your guitar
              </Link>
              <Link href="/repairs" className="btn btn-outline-light">
                Book a repair
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm md:max-w-md">
            <div className="absolute -inset-3 rounded-[18px] border border-gold/40" aria-hidden />
            <img
              src={heroImage}
              alt={settings.hero_image_path ? "Guitar from the Guitarz4U collection" : "Illustration of a sunburst electric guitar"}
              className="relative aspect-[4/5] w-full rounded-xl object-cover shadow-[var(--shadow-lift)]"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {/* Products straight away */}
      <section className="section !pt-12" aria-labelledby="featured-heading">
        <div className="container-page">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{featured.products.length ? "Hand-picked" : "In the shop"}</p>
              <h2 id="featured-heading" className="mt-1 text-3xl md:text-4xl">
                {featured.products.length ? "Featured guitars" : "Latest guitars"}
              </h2>
            </div>
            <Link href="/shop" className="btn btn-outline">
              View all <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {showcase.length ? (
            <ProductGrid products={showcase} />
          ) : (
            <div className="card px-6 py-10 text-center">
              <h3 className="text-xl">New stock is on its way</h3>
              <p className="mx-auto mt-2 max-w-md text-tan">
                Our first listings are being photographed and checked. Looking for something specific? Let us know and
                we&apos;ll keep an eye out for you.
              </p>
              <a
                href={whatsappLink(settings.whatsapp_number, "Hi Guitarz4U, I'm looking for a guitar:")}
                className="btn btn-whatsapp mt-5"
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon /> Ask on WhatsApp
              </a>
            </div>
          )}

          {latest.length > 0 && (
            <div className="mt-14">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Just in</p>
                  <h2 className="mt-1 text-3xl">New arrivals</h2>
                </div>
                <Link href="/shop?sort=newest" className="link text-sm font-semibold">
                  See newest
                </Link>
              </div>
              <ProductGrid products={latest} />
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="grain border-y border-gold/30 bg-cream-2 py-14" aria-labelledby="cat-heading">
        <div className="container-page">
          <h2 id="cat-heading" className="text-3xl">
            Shop by category
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            {categories
              .filter((c) => c.active)
              .map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/shop?category=${c.slug}`}
                    className="card flex h-full flex-col justify-between p-4 transition-all hover:-translate-y-0.5 hover:border-gold"
                  >
                    <span className="font-display text-lg">{c.name}</span>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-tan">
                      Browse <ArrowRight className="h-4 w-4" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      </section>

      {/* Three services */}
      <section className="section" aria-labelledby="services-heading">
        <div className="container-page">
          <p className="eyebrow">Buy · Sell · Repair</p>
          <h2 id="services-heading" className="mt-1 max-w-2xl text-3xl md:text-4xl">
            Everything a guitar needs for its next chapter
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: BadgeCheck,
                title: "Buy a pre-owned guitar",
                body: "Personally checked instruments with honest condition grades and clear photos. Send a request — no online payment, no pressure.",
                href: "/shop",
                cta: "Browse the shop",
              },
              {
                icon: Handshake,
                title: "Sell your guitar",
                body: "Electric, bass, acoustic or classical — working or broken. Tell us about it and receive a personal, no-obligation offer.",
                href: "/sell",
                cta: "Start a submission",
              },
              {
                icon: Wrench,
                title: "Guitar repairs",
                body: "Strings, setups, electronics, hardware, body and fretwork. Every repair is quoted personally before work begins.",
                href: "/repairs",
                cta: "Book a repair",
              },
            ].map(({ icon: Icon, ...s }) => (
              <div key={s.title} className="card flex flex-col p-6">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-walnut text-gold-light">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-4 text-xl">{s.title}</h3>
                <p className="mt-2 flex-1 text-walnut/80">{s.body}</p>
                <Link href={s.href} className="btn btn-outline mt-5 self-start">
                  {s.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How buying works */}
      <section className="bg-walnut py-14 text-cream md:py-20" aria-labelledby="how-heading">
        <div className="container-page">
          <p className="eyebrow !text-gold-light">How buying works</p>
          <h2 id="how-heading" className="mt-1 text-3xl text-ivory md:text-4xl">
            Simple, personal and payment-free online
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-4">
            {HOW_IT_WORKS.buying.map((step, i) => (
              <li key={step.title} className="rounded-xl border border-gold/30 p-5">
                <span className="font-display text-4xl text-gold">{i + 1}</span>
                <h3 className="mt-2 text-lg text-ivory">{step.title}</h3>
                <p className="mt-2 text-sm text-cream/80">{step.body}</p>
              </li>
            ))}
          </ol>
          <Link href="/how-it-works" className="btn btn-outline-light mt-8">
            Read the full guide
          </Link>
        </div>
      </section>

      {/* Why Guitarz4U */}
      <section className="section" aria-labelledby="why-heading">
        <div className="container-page grid gap-10 md:grid-cols-2">
          <div>
            <p className="eyebrow">Why Guitarz4U</p>
            <h2 id="why-heading" className="mt-1 text-3xl md:text-4xl">
              Second-hand equipment, first-hand service.
            </h2>
            <p className="mt-4 text-lg text-walnut/85">
              You deal directly with a musician who cares about getting each guitar into the right hands — and who
              will tell you exactly what you&apos;re getting.
            </p>
            <Link href="/about" className="btn btn-primary mt-6">
              About us
            </Link>
          </div>
          <ul className="grid gap-4">
            {[
              { icon: ShieldCheck, t: "Honest condition grading", d: "Wear and defects are disclosed in every listing." },
              { icon: MessageCircle, t: "Real, personal replies", d: "WhatsApp is the quickest way to reach us." },
              { icon: BadgeCheck, t: "No payment online", d: "Pay directly by EFT once your request is confirmed." },
            ].map(({ icon: Icon, t, d }) => (
              <li key={t} className="card flex gap-4 p-5">
                <Icon className="mt-1 h-6 w-6 flex-none text-gold" aria-hidden />
                <div>
                  <h3 className="text-lg">{t}</h3>
                  <p className="text-sm text-walnut/80">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Reviews */}
      <section className="grain border-y border-gold/30 bg-cream-2 py-14" aria-labelledby="reviews-heading">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Customer reviews</p>
              <h2 id="reviews-heading" className="mt-1 text-3xl">
                What customers say
              </h2>
            </div>
            <Link href="/reviews" className="link text-sm font-semibold">
              All reviews
            </Link>
          </div>
          {reviews.length ? (
            <ul className="mt-6 grid gap-5 md:grid-cols-3">
              {reviews.map((r) => (
                <li key={r.id} className="card p-5">
                  <Stars rating={r.rating ?? 0} />
                  {r.title && <h3 className="mt-2 text-lg">{r.title}</h3>}
                  <p className="mt-2 line-clamp-5 text-sm">{r.body}</p>
                  <p className="mt-3 text-xs text-tan">
                    {r.display_name} · {formatDate(r.created_at)}
                    {r.verified_purchase ? " · Verified purchase" : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 max-w-xl text-walnut/80">
              We&apos;re a new website and reviews will appear here once customers share their experiences. Every
              review is from a registered customer and is checked before it&apos;s published.
            </p>
          )}
        </div>
      </section>

      <RecentlyViewed />

      {/* Contact strip */}
      <section className="section !pb-16">
        <div className="container-page">
          <div className="card flex flex-col items-start gap-5 bg-ivory p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl">Questions? Let&apos;s chat.</h2>
              <p className="mt-1 text-walnut/80">WhatsApp is the quickest way to reach us. {settings.closed_notice}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={whatsappLink(settings.whatsapp_number, "Hi Guitarz4U!")}
                className="btn btn-whatsapp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon /> WhatsApp us
              </a>
              <Link href="/contact" className="btn btn-outline">
                Other ways to contact us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

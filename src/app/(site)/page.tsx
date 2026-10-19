import Image from "next/image";
import Link from "next/link";
import { ProductGrid } from "@/components/shop/ProductCard";
import { RecentlyViewed } from "@/components/shop/RecentlyViewed";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { ChevronRight, ShieldIcon, TagIcon, WhatsAppIcon, WrenchIcon } from "@/components/ui/Icons";
import { getCategories, getFeaturedProducts, getNewestProducts, getSpecialOffers } from "@/lib/data/products";
import { getApprovedReviews } from "@/lib/data/reviews";
import { getSiteSettings } from "@/lib/settings";
import { PAYMENT_NOTICE } from "@/lib/constants";
import { whatsappLink } from "@/lib/format";

const CATEGORY_ART: Record<string, string> = {
  electric: "/images/category-electric.svg",
  bass: "/images/category-bass.svg",
  acoustic: "/images/category-acoustic.svg",
  classical: "/images/category-classical.svg",
};

export default async function HomePage() {
  const [featured, newest, offers, categories, reviews, settings] = await Promise.all([
    getFeaturedProducts(4),
    getNewestProducts(8),
    getSpecialOffers(4),
    getCategories(),
    getApprovedReviews(3),
    getSiteSettings(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="on-dark relative isolate overflow-hidden bg-deep text-cream">
        <Image
          src="/images/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover object-[70%_center] opacity-45 sm:opacity-60"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-deep via-deep/85 to-deep/20" />
        <div className="container-page grid min-h-[34rem] items-center py-16 md:min-h-[38rem]">
          <div className="max-w-2xl animate-fade-up">
            <p className="eyebrow">Sandringham · Johannesburg</p>
            <h1 className="mt-4 text-4xl font-semibold text-cream-light sm:text-5xl md:text-6xl">
              Pre-loved guitars, <em className="font-normal text-gold-light">honestly</em> described.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-cream/85">
              Guitarz4U buys and sells second-hand electric, bass, acoustic and classical guitars — and repairs them too.
              Second-hand equipment, first-hand service.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="btn btn-gold">
                Browse guitars <ChevronRight className="h-4 w-4" />
              </Link>
              <Link href="/sell" className="btn btn-outline-light">
                Sell your guitar
              </Link>
              <Link href="/repairs" className="btn btn-outline-light">
                Book a repair
              </Link>
            </div>
            <ul className="mt-10 grid gap-4 text-sm text-cream/85 sm:grid-cols-3">
              <li className="flex gap-2">
                <ShieldIcon className="h-5 w-5 shrink-0 text-gold-light" />
                Wear and defects disclosed on every listing
              </li>
              <li className="flex gap-2">
                <TagIcon className="h-5 w-5 shrink-0 text-gold-light" />
                No online payments — EFT arranged privately after approval
              </li>
              <li className="flex gap-2">
                <WrenchIcon className="h-5 w-5 shrink-0 text-gold-light" />
                Setups, restrings and repairs by quotation
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-16" aria-labelledby="categories-heading">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Find your next guitar</p>
            <h2 id="categories-heading" className="mt-2 text-3xl sm:text-4xl">
              Shop by category
            </h2>
          </div>
          <Link href="/shop" className="hidden text-sm font-semibold text-gold-ink sm:inline-flex sm:items-center">
            View everything <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/shop/category/${c.slug}`}
                className="group card relative block overflow-hidden no-underline transition-shadow hover:shadow-[var(--shadow-lift)]"
              >
                <div className="relative aspect-[4/5] bg-cream">
                  <Image
                    src={CATEGORY_ART[c.slug] ?? "/images/placeholder-guitar.svg"}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-deep/90 to-transparent p-4 pt-16">
                    <h3 className="text-lg text-cream-light sm:text-xl">{c.name}</h3>
                    <span className="text-xs font-semibold uppercase tracking-wider text-gold-light">Browse</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Featured */}
      <section className="bg-cream/60 py-16" aria-labelledby="featured-heading">
        <div className="container-page">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Hand-picked</p>
              <h2 id="featured-heading" className="mt-2 text-3xl sm:text-4xl">
                Featured guitars
              </h2>
            </div>
            <Link href="/shop" className="text-sm font-semibold text-gold-ink">
              Shop all
            </Link>
          </div>
          {featured.length ? (
            <ProductGrid products={featured} priorityCount={2} />
          ) : (
            <div className="card p-8 text-center text-ink-soft">
              New stock is being photographed and listed. Check back soon, or{" "}
              <Link href="/account/alerts" className="font-semibold text-gold-ink">
                set up an alert
              </Link>{" "}
              to hear about new arrivals.
            </div>
          )}
        </div>
      </section>

      {/* How buying works */}
      <section className="container-page grid gap-10 py-16 lg:grid-cols-[1fr_1.2fr]" aria-labelledby="process-heading">
        <div>
          <p className="eyebrow">Simple and personal</p>
          <h2 id="process-heading" className="mt-2 text-3xl sm:text-4xl">
            How buying from Guitarz4U works
          </h2>
          <p className="mt-4 text-ink-soft">
            There is no online checkout. You send a purchase request, we check the guitar and contact you personally, and
            payment is arranged privately by EFT only once your request has been approved.
          </p>
          <p className="notice mt-6">{PAYMENT_NOTICE}</p>
          <Link href="/how-it-works" className="btn btn-outline mt-6">
            Read the full process
          </Link>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2">
          {[
            ["Browse & add to your request cart", "Choose one or more guitars. Every listing shows its condition and any disclosed defects."],
            ["Submit a purchase request", "Send your contact details and an optional message. No payment is taken."],
            ["We confirm personally", "We check availability and contact you on WhatsApp or email to confirm the price and collection."],
            ["Private EFT, then collection", "Pay by EFT only after approval. Once we confirm receipt, we arrange collection privately."],
          ].map(([title, body], i) => (
            <li key={title} className="card p-5">
              <span className="font-display text-3xl text-gold">0{i + 1}</span>
              <h3 className="mt-2 text-lg">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Sell & repair */}
      <section className="container-page grid gap-6 pb-16 md:grid-cols-2">
        <div className="on-dark grain relative overflow-hidden rounded-[var(--radius-card)] bg-walnut p-8 text-cream sm:p-10">
          <p className="eyebrow">Sell to us</p>
          <h2 className="mt-2 text-3xl text-cream-light">Got a guitar you no longer play?</h2>
          <p className="mt-3 text-cream/85">
            Working, broken or incomplete — we&apos;re interested in electric, bass, acoustic and classical guitars. Send
            photos and details, and we&apos;ll personally review it. (We don&apos;t buy loose parts on their own.)
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/sell" className="btn btn-gold">
              Start a submission
            </Link>
            <a
              href={whatsappLink(settings.contact.whatsapp_number, "Hi Guitarz4U, I'd like to sell a guitar.")}
              className="btn btn-outline-light"
              target="_blank"
              rel="noopener"
            >
              <WhatsAppIcon /> Send on WhatsApp
            </a>
          </div>
        </div>
        <div className="grain relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-cream p-8 sm:p-10">
          <p className="eyebrow">Repairs & setups</p>
          <h2 className="mt-2 text-3xl">Make it play like it should</h2>
          <p className="mt-3 text-ink-soft">
            Restrings, setups, electronics, hardware, body repairs and fretwork. Every job is assessed and quoted
            personally before any work begins.
          </p>
          <Link href="/repairs" className="btn btn-primary mt-6">
            Book a repair assessment
          </Link>
        </div>
      </section>

      {/* Special offers */}
      {offers.length > 0 && (
        <section className="container-page pb-16" aria-labelledby="offers-heading">
          <div className="mb-8">
            <p className="eyebrow">Reduced</p>
            <h2 id="offers-heading" className="mt-2 text-3xl sm:text-4xl">
              Special offers
            </h2>
          </div>
          <ProductGrid products={offers} />
        </section>
      )}

      {/* Newest */}
      <section className="container-page pb-16" aria-labelledby="newest-heading">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Just in</p>
            <h2 id="newest-heading" className="mt-2 text-3xl sm:text-4xl">
              Newest listings
            </h2>
          </div>
          <Link href="/shop?sort=newest" className="text-sm font-semibold text-gold-ink">
            See all new arrivals
          </Link>
        </div>
        {newest.length ? (
          <ProductGrid products={newest} />
        ) : (
          <p className="card p-8 text-center text-ink-soft">No guitars are listed right now. Please check back soon.</p>
        )}
      </section>

      {/* Reviews */}
      <section className="bg-cream/60 py-16" aria-labelledby="reviews-heading">
        <div className="container-page">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">In their words</p>
              <h2 id="reviews-heading" className="mt-2 text-3xl sm:text-4xl">
                Customer reviews
              </h2>
            </div>
            <Link href="/reviews" className="btn btn-outline btn-sm">
              Read or write a review
            </Link>
          </div>
          {reviews.length ? (
            <ul className="grid gap-5 md:grid-cols-3">
              {reviews.map((r) => (
                <li key={r.id}>
                  <ReviewCard review={r} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="card p-8 text-center text-ink-soft">
              We&apos;re new online and don&apos;t have any published reviews yet. Bought, sold or repaired a guitar with us?{" "}
              <Link href="/reviews" className="font-semibold text-gold-ink">
                Be the first to leave a review.
              </Link>
            </p>
          )}
        </div>
      </section>

      <RecentlyViewed />
    </>
  );
}

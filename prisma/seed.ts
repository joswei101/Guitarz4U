/**
 * Seeds essential reference data: categories, editable pages (policies etc.), FAQs and a hero banner.
 * Safe to run repeatedly. Does NOT create any users, products or reviews.
 * Set SEED_DEMO=1 (development only) to add clearly-labelled sample products for local testing.
 */
import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import { PAGE_DEFS } from "../src/lib/content";

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: "electric-guitars", name: "Electric guitars", sortOrder: 1 },
  { slug: "bass-guitars", name: "Bass guitars", sortOrder: 2 },
  { slug: "acoustic-guitars", name: "Acoustic guitars", sortOrder: 3 },
  { slug: "classical-guitars", name: "Classical guitars", sortOrder: 4 },
  { slug: "electro-acoustic-guitars", name: "Electro-acoustic guitars", sortOrder: 5 },
  { slug: "vintage-collectible", name: "Vintage & collectible", sortOrder: 6 },
  { slug: "amplifiers", name: "Guitar amplifiers", sortOrder: 7 },
  { slug: "parts", name: "Selected guitar parts", sortOrder: 8, isPartsCategory: true },
  { slug: "other-string-instruments", name: "Other string instruments", sortOrder: 9 },
];

const FAQS: { category: string; question: string; answer: string }[] = [
  { category: "Buying", question: "Are your guitars new or second-hand?", answer: "Almost everything we sell is second-hand. Each item is inspected and listed with a condition rating, detailed condition notes and photos of the actual item." },
  { category: "Buying", question: "How do I pay?", answer: "Online by card only, through PayFast, a South African payment gateway. We never see or store your card details. Your order is confirmed once PayFast verifies the payment." },
  { category: "Buying", question: "Do you deliver?", answer: "No — we are collection only, in the Sandringham area of Johannesburg. After your payment is confirmed we contact you privately with the collection address and to arrange a time." },
  { category: "Buying", question: "Why do I need an account to check out?", answer: "Your account keeps your order, receipt and private collection details secure, and lets you track your order status." },
  { category: "Buying", question: "What happens if two people try to buy the same guitar?", answer: "Each guitar is a unique item. When you start checkout, the item is held for you for a short time. If payment is not completed in time the hold is released." },
  { category: "Buying", question: "Can I see a guitar before buying?", answer: "Ask us on WhatsApp or through the product questions section and we will do our best to help with extra photos, videos or a viewing." },
  { category: "Buying", question: "What is your returns policy?", answer: "Please read our Returns, Refunds & Cancellations policy. Your rights under South African consumer law are not affected." },
  { category: "Selling", question: "What do you buy?", answer: "Used, broken and incomplete guitars and selected guitar-related parts and equipment. The Sell Your Guitar form lists the types we are currently accepting." },
  { category: "Selling", question: "Do I need to name a price?", answer: "No. Just describe the item honestly and add clear photos. If we are interested, we will make you an offer with no obligation to accept." },
  { category: "Selling", question: "Will my photos be published?", answer: "No. Photos and videos you submit are stored privately and only used to assess your item." },
  { category: "Repairs", question: "Do I pay when I book a repair?", answer: "No. The owner reviews your request, inspects the instrument and sends you a quote. Work only begins after you accept the quote, and payment is due once the repair is complete." },
  { category: "Repairs", question: "Who pays for replacement parts?", answer: "Replacement parts are paid for by the customer, as listed on the approved quote." },
  { category: "Repairs", question: "Is there a warranty on repairs?", answer: "Yes — a limited repair warranty covering the work on your quote. The duration and conditions are stated on each quote." },
  { category: "Repairs", question: "Where do I drop off my instrument?", answer: "Drop-off is arranged privately once your request has been accepted. We do not publish our exact address." },
  { category: "General", question: "When are you open?", answer: "We are closed on Saturdays. For everything else, message us on WhatsApp or email and we will reply as soon as we can." },
];

async function main() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({ where: { slug: c.slug }, create: c, update: { name: c.name, sortOrder: c.sortOrder, isPartsCategory: c.isPartsCategory ?? false } });
  }
  for (const def of PAGE_DEFS) {
    const body = await fs.readFile(path.join(__dirname, "content", def.file), "utf8");
    await prisma.page.upsert({
      where: { slug: def.slug },
      create: { slug: def.slug, title: def.title, metaDescription: def.metaDescription, body, requiresLegalReview: def.requiresLegalReview, publishedAt: new Date() },
      update: {}, // never overwrite owner edits
    });
  }
  if ((await prisma.faq.count()) === 0) {
    await prisma.faq.createMany({ data: FAQS.map((f, i) => ({ ...f, sortOrder: i })) });
  }
  if ((await prisma.banner.count()) === 0) {
    await prisma.banner.create({ data: { heading: "Second-hand equipment. First-hand service.", subheading: "Inspected pre-owned guitars, amps and parts — plus honest, expert repairs in Sandringham, Johannesburg.", ctaLabel: "Shop guitars", ctaHref: "/shop" } });
  }

  if (process.env.SEED_DEMO === "1") {
    if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo products in production");
    const { seedDemo } = await import("./seed-demo");
    await seedDemo(prisma);
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

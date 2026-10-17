/**
 * DEVELOPMENT ONLY: clearly-labelled sample listings for trying the shop locally.
 * Every title starts with "[SAMPLE]" so they can never be mistaken for real stock.
 * No reviews or customers are created.
 */
import type { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

const SAMPLES = [
  { cat: "electric-guitars", brand: "Gibson", model: "Les Paul Standard", price: 3450000, sale: null, cond: "VERY_GOOD", featured: true, notes: "Light buckle rash on the back; frets around 80% with no divots. Electronics clean." },
  { cat: "electric-guitars", brand: "Fender", model: "Player Stratocaster", price: 1299900, sale: 1149900, cond: "EXCELLENT", featured: true, notes: "Minor pick wear near the pickguard. Freshly set up." },
  { cat: "bass-guitars", brand: "Ibanez", model: "SR300E", price: 699900, sale: null, cond: "GOOD", featured: false, notes: "Several dings on the body edges, all photographed. Plays well." },
  { cat: "acoustic-guitars", brand: "Yamaha", model: "FG800", price: 349900, sale: null, cond: "VERY_GOOD", featured: true, notes: "Small finish scratch below the soundhole." },
  { cat: "amplifiers", brand: "Marshall", model: "DSL40CR", price: 1150000, sale: null, cond: "GOOD", featured: false, notes: "Tolex scuffs on corners. Reverb and both channels working." },
  { cat: "parts", brand: "Seymour Duncan", model: "JB humbucker (used)", price: 95000, sale: null, cond: "EXCELLENT", featured: false, notes: "Removed from a working guitar; full-length leads.", qty: 3 },
];

export async function seedDemo(prisma: PrismaClient) {
  const hero = await fs.readFile(path.join(process.cwd(), "public", "images", "hero.webp"));
  const dir = path.resolve(process.env.LOCAL_STORAGE_DIR ?? "./storage", "products", "demo");
  await fs.mkdir(dir, { recursive: true });
  let n = 0;
  for (const s of SAMPLES) {
    n++;
    const sku = `DEMO-${String(n).padStart(3, "0")}`;
    if (await prisma.product.findUnique({ where: { sku } })) continue;
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: s.cat } });
    const key = `products/demo/${sku.toLowerCase()}.webp`;
    const full = await sharp(hero).webp({ quality: 80 }).toBuffer();
    const thumb = await sharp(hero).resize(640).webp({ quality: 75 }).toBuffer();
    await fs.writeFile(path.join(dir, `${sku.toLowerCase()}.webp`), full);
    await fs.writeFile(path.join(dir, `${sku.toLowerCase()}_thumb.webp`), thumb);
    const file = await prisma.storedFile.create({ data: { storageKey: key, kind: "IMAGE", mimeType: "image/webp", sizeBytes: full.length, isPublic: true, width: 1920, height: 1280 } });
    await prisma.product.create({
      data: {
        sku,
        slug: `sample-${s.brand}-${s.model}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        title: `[SAMPLE] ${s.brand} ${s.model}`,
        brand: s.brand,
        model: s.model,
        categoryId: category.id,
        description: "This is a sample listing for local development only. It is not real stock.",
        priceCents: s.price,
        salePriceCents: s.sale,
        condition: s.cond as never,
        conditionNotes: s.notes,
        specifications: { Body: "See photos", Notes: "Sample data" },
        status: "AVAILABLE",
        quantity: s.qty ?? 1,
        lowStockThreshold: s.qty ? 2 : null,
        isFeatured: s.featured,
        publishedAt: new Date(Date.now() - n * 3600_000),
        acquisitionCostCents: Math.round(s.price * 0.55),
        refurbishmentCostCents: 30000,
        media: { create: { fileId: file.id, altText: `${s.brand} ${s.model}`, sortOrder: 0 } },
      },
    });
  }
  console.log("Demo products seeded.");
}

// Adds clearly-labelled DEMONSTRATION products so you can try the shop before
// adding real stock. Every demo product has is_demo = true, "DEMO" in its title
// and a "DEMO" watermark on its illustration. Remove with: npm run db:remove-demo
// No reviews, customers or testimonials are created.
import "./load-env";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

type Kind = "electric" | "bass" | "acoustic" | "classical";
const DEMOS: { title: string; kind: Kind; cat: string; price: number; was?: number; condition: string; status: "published" | "reserved"; featured: boolean; color: string; description: string; defects: string }[] = [
  { title: "DEMO — Sunburst single-cut electric", kind: "electric", cat: "electric-guitars", price: 8500, condition: "very_good", status: "published", featured: true, color: "#9b4a1c",
    description: "Demonstration listing used to preview the shop. Replace with your real stock.", defects: "Demonstration item — example: light buckle rash on the back, small chip near the input jack." },
  { title: "DEMO — Olympic white double-cut electric", kind: "electric", cat: "electric-guitars", price: 5200, was: 6000, condition: "good", status: "published", featured: true, color: "#e9e4d4",
    description: "Demonstration listing showing how a special offer looks.", defects: "Demonstration item — example: worn frets on the first five positions." },
  { title: "DEMO — Natural four-string bass", kind: "bass", cat: "bass-guitars", price: 6900, condition: "excellent", status: "published", featured: true, color: "#c8a26b",
    description: "Demonstration bass listing.", defects: "Demonstration item — none noted." },
  { title: "DEMO — Black five-string bass (project)", kind: "bass", cat: "bass-guitars", price: 1800, condition: "for_repair", status: "published", featured: false, color: "#1c1714",
    description: "Demonstration listing for an incomplete instrument sold as a project.", defects: "Demonstration item — example: missing bridge pickup, output jack not working." },
  { title: "DEMO — Dreadnought acoustic", kind: "acoustic", cat: "acoustic-guitars", price: 3900, condition: "good", status: "published", featured: true, color: "#d6a560",
    description: "Demonstration acoustic listing.", defects: "Demonstration item — example: small finish crack near the end pin, does not affect playability." },
  { title: "DEMO — Electro-acoustic cutaway", kind: "acoustic", cat: "acoustic-guitars", price: 4600, condition: "very_good", status: "reserved", featured: false, color: "#7a3b1d",
    description: "Demonstration listing showing how a reserved item looks.", defects: "Demonstration item — example: preamp battery cover missing." },
  { title: "DEMO — Classical nylon-string guitar", kind: "classical", cat: "classical-guitars", price: 2200, condition: "good", status: "published", featured: true, color: "#e0b778",
    description: "Demonstration classical listing.", defects: "Demonstration item — example: tuner buttons slightly worn." },
  { title: "DEMO — Student classical guitar", kind: "classical", cat: "classical-guitars", price: 950, condition: "fair", status: "published", featured: false, color: "#b9874f",
    description: "Demonstration listing.", defects: "Demonstration item — example: several dings on the top, action slightly high." },
];

function guitarSvg(kind: Kind, color: string, label: string) {
  const body =
    kind === "acoustic" || kind === "classical"
      ? `<path d="M600 610c-120-10-215 60-215 175 0 70 35 110 35 150 0 45-75 85-75 200 0 160 120 245 255 245s255-85 255-245c0-115-75-155-75-200 0-40 35-80 35-150 0-115-95-185-215-175z" fill="${color}" stroke="#241A16" stroke-width="8"/>
         <circle cx="600" cy="905" r="${kind === "classical" ? 62 : 70}" fill="#241A16"/><circle cx="600" cy="905" r="${kind === "classical" ? 78 : 86}" fill="none" stroke="#B08A52" stroke-width="8"/>
         <rect x="535" y="1150" width="130" height="26" rx="6" fill="#241A16"/>`
      : kind === "bass"
        ? `<path d="M520 700c-80-60-200-20-200 120 0 90 60 120 60 170 0 60-90 100-90 210 0 130 110 200 260 200s240-60 240-190c0-110-80-140-80-200 0-60 120-120 90-230-25-90-110-110-170-60-30 25-40 30-60 30s-25-25-50-50z" fill="${color}" stroke="#241A16" stroke-width="8"/>
           <rect x="520" y="960" width="160" height="40" rx="10" fill="#241A16"/><rect x="530" y="1140" width="140" height="40" rx="8" fill="#9a9a9a"/>`
        : `<path d="M560 700c-60-70-230-40-230 110 0 90 55 120 55 170 0 70-90 100-90 210 0 140 120 220 280 220s270-70 270-210c0-110-90-150-90-210 0-50 80-90 60-180-20-90-130-100-180-40-20 25-40 30-75 30z" fill="${color}" stroke="#241A16" stroke-width="8"/>
           <rect x="525" y="930" width="150" height="46" rx="8" fill="#241A16"/><rect x="525" y="1050" width="150" height="46" rx="8" fill="#241A16"/><rect x="540" y="1160" width="120" height="30" rx="6" fill="#bdbdbd"/>`;
  const neckLen = kind === "bass" ? 520 : 440;
  const neckTop = 640 - neckLen;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
  <defs><radialGradient id="bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#FFF9EE"/><stop offset="1" stop-color="#E9DCC3"/></radialGradient></defs>
  <rect width="1200" height="1500" fill="url(#bg)"/>
  <rect x="${kind === "bass" ? 570 : 572}" y="${neckTop}" width="${kind === "bass" ? 60 : 56}" height="${neckLen + 80}" fill="#5a3a22" stroke="#241A16" stroke-width="6"/>
  ${Array.from({ length: 14 }, (_, i) => `<line x1="572" x2="628" y1="${neckTop + 40 + i * (neckLen / 15)}" y2="${neckTop + 40 + i * (neckLen / 15)}" stroke="#d9d2c0" stroke-width="3"/>`).join("")}
  <path d="M560 ${neckTop}l-20-110h120l-20 110z" fill="#38271F" stroke="#241A16" stroke-width="6"/>
  ${body}
  <text x="600" y="760" transform="rotate(-28 600 760)" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="230" fill="#241A16" fill-opacity="0.18" letter-spacing="20">DEMO</text>
  <rect x="0" y="1380" width="1200" height="120" fill="#241A16"/>
  <text x="600" y="1455" text-anchor="middle" font-family="Georgia, serif" font-size="44" fill="#D9B779">Demonstration listing · ${label}</text>
</svg>`);
}

(async () => {
  const { pool, query, queryOne } = await import("../src/lib/db");
  const { putObject } = await import("../src/lib/storage");
  const { slugify } = await import("../src/lib/format");
  const existing = await queryOne<{ n: number }>("select count(*)::int n from products where is_demo");
  if ((existing?.n ?? 0) > 0) {
    console.log(`Demo products already exist (${existing!.n}). Run npm run db:remove-demo first to re-seed.`);
    await pool.end();
    return;
  }
  const brand = await queryOne<{ id: number }>("insert into brands (name, slug) values ('Demo', 'demo') on conflict (slug) do update set name=excluded.name returning id");
  for (const [i, d] of DEMOS.entries()) {
    const cat = await queryOne<{ id: number }>("select id from categories where slug=$1", [d.cat]);
    const slug = `${slugify(d.title)}-${i + 1}`;
    const p = await queryOne<{ id: string }>(
      `insert into products (slug, title, brand_id, model, category_id, price_cents, compare_at_price_cents, condition, description, defects, history, status, featured, is_demo, published_at, created_at)
       values ($1,$2,$3,'Demo model',$4,$5,$6,$7,$8,$9,'',$10,$11,true, now(), now() - make_interval(days => $12)) returning id`,
      [slug, d.title, brand!.id, cat!.id, d.price * 100, d.was ? d.was * 100 : null, d.condition, d.description, d.defects, d.status, d.featured, i],
    );
    const webp = await sharp(guitarSvg(d.kind, d.color, d.title.replace("DEMO — ", ""))).webp({ quality: 78 }).toBuffer();
    const key = `products/${randomUUID()}.webp`;
    await putObject("public", key, webp, "image/webp");
    await query("insert into product_images (product_id, storage_key, alt_text, width, height, sort_order) values ($1,$2,$3,1200,1500,0)", [p!.id, key, `Illustration for demonstration listing: ${d.title}`]);
  }
  console.log(`✔ Added ${DEMOS.length} DEMO products. Remove them before launch with: npm run db:remove-demo`);
  await pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

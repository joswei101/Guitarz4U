import { promises as fs } from "fs";
import path from "path";
import { cache } from "react";
import { prisma } from "./db";

export interface PageDef {
  slug: string;
  title: string;
  metaDescription: string;
  file: string;
  requiresLegalReview: boolean;
}

/** Owner-editable pages. Default content lives in prisma/content and is copied to the database by the seed. */
export const PAGE_DEFS: PageDef[] = [
  { slug: "about", title: "About Guitarz4U", metaDescription: "Owner-run guitar shop and repair service in Sandringham, Johannesburg.", file: "about.md", requiresLegalReview: false },
  { slug: "how-it-works", title: "Buying, selling & repair process", metaDescription: "How buying, selling and repairing guitars with Guitarz4U works, step by step.", file: "how-it-works.md", requiresLegalReview: false },
  { slug: "privacy", title: "Privacy policy", metaDescription: "How Guitarz4U collects, uses and protects personal information (POPIA).", file: "privacy.md", requiresLegalReview: true },
  { slug: "terms", title: "Terms & conditions", metaDescription: "Terms and conditions for using the Guitarz4U website and buying from Guitarz4U.", file: "terms.md", requiresLegalReview: true },
  { slug: "returns", title: "Returns, refunds & cancellations", metaDescription: "Returns, refunds and cancellations policy for Guitarz4U purchases.", file: "returns.md", requiresLegalReview: true },
  { slug: "condition", title: "Used-gear condition disclosure", metaDescription: "How Guitarz4U rates and discloses the condition of second-hand instruments.", file: "condition.md", requiresLegalReview: true },
  { slug: "repair-terms", title: "Repair terms & warranty", metaDescription: "Terms for Guitarz4U repair services and the limited repair warranty.", file: "repair-terms.md", requiresLegalReview: true },
  { slug: "sell-terms", title: "Purchase enquiry terms", metaDescription: "Terms for submitting a guitar or equipment to Guitarz4U for purchase consideration.", file: "sell-terms.md", requiresLegalReview: true },
  { slug: "collection", title: "Collection-only policy", metaDescription: "Guitarz4U is collection only in Sandringham, Johannesburg.", file: "collection.md", requiresLegalReview: true },
];

export async function defaultPageBody(def: PageDef): Promise<string> {
  return fs.readFile(path.join(process.cwd(), "prisma", "content", def.file), "utf8");
}

export const getPage = cache(async (slug: string) => {
  const def = PAGE_DEFS.find((p) => p.slug === slug);
  if (!def) return null;
  const row = await prisma.page.findUnique({ where: { slug } });
  if (row) return { title: row.title, body: row.body, metaDescription: row.metaDescription ?? def.metaDescription, updatedAt: row.publishedAt ?? row.updatedAt, requiresLegalReview: row.requiresLegalReview };
  return { title: def.title, body: await defaultPageBody(def), metaDescription: def.metaDescription, updatedAt: null, requiresLegalReview: def.requiresLegalReview };
});

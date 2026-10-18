import { NextResponse } from "next/server";
import { z } from "zod";
import { getProductsByIds } from "@/lib/products";

// Returns public card data for the given product ids (used by the request cart and
// "recently viewed"). Sold, draft and archived items are simply not returned.
export async function GET(req: Request) {
  const ids = new URL(req.url).searchParams.get("ids")?.split(",").filter(Boolean).slice(0, 20) ?? [];
  const parsed = z.array(z.uuid()).safeParse(ids);
  if (!parsed.success) return NextResponse.json({ products: [] });
  const products = await getProductsByIds(parsed.data);
  return NextResponse.json({ products }, { headers: { "cache-control": "no-store" } });
}

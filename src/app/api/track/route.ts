import { NextResponse } from "next/server";
import { z } from "zod";
import { track } from "@/lib/analytics";
import { rateLimit } from "@/lib/rate-limit";
import { clientKey } from "@/lib/http";

const schema = z.object({
  event: z.enum(["page_view", "product_view", "whatsapp_click"]),
  path: z.string().max(300).default(""),
  productId: z.uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const data = schema.parse(await req.json());
    if (await rateLimit(`track:${await clientKey()}`, 120, 60)) {
      await track(data.event, { path: data.path, productId: data.productId });
    }
  } catch {
    /* ignore malformed analytics */
  }
  return new NextResponse(null, { status: 204 });
}

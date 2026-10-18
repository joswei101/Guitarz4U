import { NextResponse } from "next/server";
import { handlePayfastItn } from "@/lib/shop/payments";
import { logger } from "@/lib/logger";

/**
 * PayFast ITN (server-to-server payment notification). This — not the browser redirect —
 * is what marks orders and repairs as paid. Always answers 200 for handled/duplicate events so
 * PayFast stops retrying; returns 500 on unexpected errors so PayFast retries later.
 */
export async function POST(req: Request) {
  const body = await req.text();
  try {
    const outcome = await handlePayfastItn(body);
    return new NextResponse(outcome, { status: outcome === "invalid" ? 400 : 200 });
  } catch (err) {
    logger.error("ITN processing failed", { err });
    return new NextResponse("error", { status: 500 });
  }
}

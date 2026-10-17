import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { assertSameOrigin, ipFromRequest, jsonError } from "@/lib/http";
import { enforceRateLimit, limits } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth/session";
import { createPurchaseEnquiry } from "@/lib/submissions";
import { fieldErrors } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await enforceRateLimit(`enquiry:${ipFromRequest(req)}`, limits.form.limit, limits.form.window);
    const form = await req.formData();
    if (form.get("website")) return NextResponse.json({ ok: true, reference: "RECEIVED" }); // honeypot
    const enquiry = await createPurchaseEnquiry(form, await getCurrentUser());
    return NextResponse.json({ ok: true, reference: enquiry.reference });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(err) }, { status: 400 });
    return jsonError(err);
  }
}

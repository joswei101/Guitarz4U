"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { runAction } from "@/lib/action";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { enforceRateLimit, limits } from "@/lib/rate-limit";
import { createOrderFromCart } from "@/lib/shop/orders";
import { features } from "@/lib/env";
import type { ActionResult } from "@/lib/errors";

export async function placeOrderAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let orderId: string | null = null;
  const result = await runAction<undefined>(async () => {
    const user = await requireVerifiedUser();
    if (!features.payfast()) return { ok: false, error: "Online card payments are not available yet. Please contact us on WhatsApp to arrange your purchase." };
    await enforceRateLimit(`checkout:${user.id}`, limits.checkout.limit, limits.checkout.window);
    const input = z
      .object({ discountCode: z.string().trim().max(40).optional(), customerNotes: z.string().trim().max(1000).optional(), phone: z.string().trim().max(20).optional() })
      .parse({ discountCode: form.get("discountCode") || undefined, customerNotes: form.get("customerNotes") || undefined, phone: form.get("phone") || undefined });
    const { order } = await createOrderFromCart({ userId: user.id, ...input, acceptTerms: form.get("acceptTerms") === "on" });
    orderId = order.id;
  });
  if (orderId) redirect(`/checkout/pay/${orderId}`);
  return result;
}

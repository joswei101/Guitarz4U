import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { env, features } from "./env";
import { prisma } from "./db";
import { UserError } from "./errors";
import { logger } from "./logger";
import { CONDITION_LABELS } from "./catalog";

/**
 * Optional AI-assisted price estimate. The result is stored as a PENDING suggestion and is
 * NEVER applied to a product automatically — the owner must review and approve it.
 * Manual pricing always works whether or not this is configured.
 */
const EstimateSchema = z.object({
  suggested_price_zar: z.number(),
  low_zar: z.number(),
  high_zar: z.number(),
  rationale: z.string(),
});

const SYSTEM = `You help a small second-hand guitar shop in Johannesburg, South Africa estimate fair retail asking prices in South African rand (ZAR) for used instruments and equipment.
Base the estimate on the brand, model, category, condition and disclosed faults provided. Consider the South African second-hand market (local classifieds and used-gear retailers), import costs and typical depreciation.
You cannot browse live listings, so state clearly in the rationale which factors drove the estimate and how confident you are. Keep the rationale under 120 words. This is an estimate for the owner to review, not a valuation.`;

export async function requestPriceSuggestion(productId: string): Promise<string> {
  if (!features.aiPricing()) throw new UserError("AI pricing estimates are not configured. Set ANTHROPIC_API_KEY to enable them; manual pricing works without it.");
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { category: true } });
  if (!product) throw new UserError("Product not found.", 404);

  const specs = Object.entries((product.specifications ?? {}) as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join("; ");
  const prompt = [
    `Category: ${product.category.name}`,
    `Brand: ${product.brand}`,
    `Model: ${product.model}`,
    `Title: ${product.title}`,
    `Condition rating: ${CONDITION_LABELS[product.condition]}`,
    `Condition notes: ${product.conditionNotes || "none"}`,
    `Left-handed: ${product.isLeftHanded ? "yes" : "no"}`,
    specs ? `Specifications: ${specs}` : "",
    product.description ? `Description: ${product.description.slice(0, 1500)}` : "",
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey: env().ANTHROPIC_API_KEY });
  let response;
  try {
    response = await client.beta.messages.create({
      model: env().AI_PRICING_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: zodOutputFormat(EstimateSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: `Estimate a retail asking price for this item:\n${prompt}` }],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new UserError("The AI service is busy. Please try again shortly, or set the price manually.");
    if (err instanceof Anthropic.APIError) {
      logger.error("AI pricing API error", { status: err.status, message: err.message });
      throw new UserError("The AI pricing service is unavailable right now. Please set the price manually.");
    }
    throw err;
  }
  if (response.stop_reason === "refusal") throw new UserError("The AI service declined to estimate this item. Please price it manually.");
  const text = response.content.find((b) => b.type === "text");
  const parsed = text && text.type === "text" ? EstimateSchema.safeParse(JSON.parse(text.text)) : null;
  if (!parsed?.success) throw new UserError("The AI estimate could not be read. Please price this item manually.");
  const e = parsed.data;
  const toCents = (n: number) => Math.max(0, Math.round(n * 100));
  const suggestion = await prisma.priceSuggestion.create({
    data: {
      productId,
      suggestedCents: toCents(e.suggested_price_zar),
      lowCents: toCents(e.low_zar),
      highCents: toCents(e.high_zar),
      rationale: e.rationale.slice(0, 2000),
      source: `AI estimate (${response.model})`,
    },
  });
  return suggestion.id;
}

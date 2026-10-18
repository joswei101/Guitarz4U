import { z } from "zod";
import { publicFormHandler, ok, UserError } from "@/lib/api";
import { lookupByReference } from "@/lib/lookup";

const schema = z.object({
  reference: z.string().trim().min(8, "Please enter your reference number.").max(20),
  contact: z.string().trim().min(5, "Please enter the email address or phone number you used.").max(200),
});

export async function POST(req: Request) {
  // Tight limit: references are random, and this stops guessing.
  return publicFormHandler(req, { bucket: "lookup", limit: 15, windowSeconds: 900 }, async (form) => {
    const d = schema.parse({ reference: form.get("reference"), contact: form.get("contact") });
    const result = await lookupByReference(d.reference, d.contact);
    if (!result) throw new UserError("We could not find a request with that reference and contact detail. Please check both and try again.", 404);
    return ok({ result });
  });
}

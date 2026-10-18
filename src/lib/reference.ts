import { randomInt } from "node:crypto";

// Unambiguous characters (no 0/O, 1/I/L) so references are easy to read out over WhatsApp.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** e.g. G4U-PR-7KQ2MX9A — random, so references cannot be guessed in sequence. */
export function makeReference(prefix: "PR" | "RS" | "SL" | "RP"): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `G4U-${prefix}-${s}`;
}

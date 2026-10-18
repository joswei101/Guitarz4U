import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export const SETTING_DEFAULTS = {
  /** Instrument & equipment types the owner currently accepts for purchase enquiries. */
  "sell.acceptedTypes": [
    "Electric guitar",
    "Bass guitar",
    "Acoustic guitar",
    "Classical guitar",
    "Electro-acoustic guitar",
    "Left-handed guitar",
    "Vintage / collectible guitar",
    "Guitar amplifier",
    "Guitar pickups",
    "Guitar necks or bodies",
    "Tuners, bridges and hardware",
  ] as string[],
  /** Default limited repair warranty wording; the actual duration is set per job on each quote. */
  "repairs.defaultWarrantyTerms":
    "Limited warranty covering the specific work listed on this quote. [OWNER TO CONFIRM duration and conditions]. Excludes damage caused by accidents, misuse, modification by others, environmental conditions (humidity/temperature), normal wear such as string and fret wear, and parts supplied by the customer.",
  "repairs.acceptingRequests": true,
  "shop.reservationMinutes": 20,
};

type Settings = typeof SETTING_DEFAULTS;

export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return (row?.value as Settings[K] | undefined) ?? SETTING_DEFAULTS[key];
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await prisma.setting.upsert({ where: { key }, create: { key, value: value as Prisma.InputJsonValue }, update: { value: value as Prisma.InputJsonValue } });
}

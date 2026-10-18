import { PrismaClient } from "@prisma/client";

/** Clears rate-limit counters so repeated local E2E runs aren't throttled (rate limiting itself is covered by integration tests). */
export default async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    await prisma.rateLimit.deleteMany();
  } finally {
    await prisma.$disconnect();
  }
}

import { prisma } from "@/lib/db";

/** Truncates every application table (fast reset between tests). */
export async function resetDb() {
  if (!/test/.test(new URL(process.env.DATABASE_URL!).pathname)) throw new Error("resetDb only runs against a test database");
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

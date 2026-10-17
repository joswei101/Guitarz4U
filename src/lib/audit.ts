import type { Prisma } from "@prisma/client";
import { prisma, type Tx } from "./db";

export async function audit(
  entry: { actorId?: string | null; action: string; entityType: string; entityId?: string | null; details?: Prisma.InputJsonValue; ipAddress?: string },
  tx: Tx | typeof prisma = prisma,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      details: entry.details,
      ipAddress: entry.ipAddress,
    },
  });
}

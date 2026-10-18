"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { runAction } from "@/lib/action";
import { requirePermission } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { destroyAllSessions } from "@/lib/auth/session";
import { processAccountDeletion } from "@/lib/customers";
import { UserError, type ActionResult } from "@/lib/errors";
import { sendEmail } from "@/lib/notify";

export async function setCustomerStatusAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("customers:manage");
    const id = z.string().parse(form.get("id"));
    const status = z.enum(["ACTIVE", "SUSPENDED"]).parse(form.get("status"));
    const reason = String(form.get("reason") ?? "").trim();
    if (id === user.id) throw new UserError("You can't change your own account status.");
    if (status === "SUSPENDED" && reason.length < 5) throw new UserError("Give a reason for suspending this account.");
    await prisma.user.update({ where: { id }, data: { status, suspendedReason: status === "SUSPENDED" ? reason : null } });
    if (status === "SUSPENDED") await destroyAllSessions(id);
    await audit({ actorId: user.id, action: `customer.${status.toLowerCase()}`, entityType: "User", entityId: id, details: { reason } });
    revalidatePath("/admin/customers");
    return { ok: true, message: status === "SUSPENDED" ? "Account suspended and signed out." : "Account reactivated." };
  });
}

export async function setRoleAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("settings:manage");
    const id = z.string().parse(form.get("id"));
    const role = z.enum(["CUSTOMER", "CONTENT_MANAGER", "ADMIN"]).parse(form.get("role"));
    if (id === user.id) throw new UserError("You can't change your own role.");
    const target = await prisma.user.findUniqueOrThrow({ where: { id } });
    if (!target.emailVerifiedAt) throw new UserError("Staff accounts must have a verified email address.");
    await prisma.user.update({ where: { id }, data: { role } });
    await destroyAllSessions(id);
    await audit({ actorId: user.id, action: "customer.role_changed", entityType: "User", entityId: id, details: { from: target.role, to: role } });
    revalidatePath("/admin/customers");
    return { ok: true, message: `Role changed to ${role}.` };
  });
}

export async function resolveDeletionAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("customers:manage");
    const id = z.string().parse(form.get("id"));
    const decision = z.enum(["complete", "reject"]).parse(form.get("decision"));
    const resolution = z.string().trim().min(3, "Add a short resolution note").max(1000).parse(form.get("resolution"));
    const req = await prisma.accountDeletionRequest.findUniqueOrThrow({ where: { id }, include: { user: true } });
    const email = req.user.email;
    const name = req.user.name;
    if (decision === "complete") {
      await processAccountDeletion(id, user.id, resolution);
      await sendEmail("accountDeleted", email, { name, resolution });
    } else {
      await prisma.$transaction([
        prisma.accountDeletionRequest.update({ where: { id }, data: { status: "REJECTED", resolution, resolvedById: user.id, resolvedAt: new Date() } }),
        prisma.user.update({ where: { id: req.userId }, data: { status: "ACTIVE" } }),
      ]);
      await audit({ actorId: user.id, action: "account.deletion_rejected", entityType: "User", entityId: req.userId, details: { resolution } });
    }
    revalidatePath("/admin/customers");
    return { ok: true, message: decision === "complete" ? "Account deleted and anonymised." : "Request closed." };
  });
}

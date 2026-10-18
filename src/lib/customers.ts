import { prisma } from "./db";
import { UserError } from "./errors";
import { audit } from "./audit";
import { hashPassword } from "./auth/password";
import { randomToken } from "./crypto";
import { ACTIVE_REPAIR_STATUSES } from "./repairs/status";

/**
 * Processes an approved account deletion (POPIA). Personal profile data is erased; financial
 * records (orders, payments, refunds, repair invoices) are retained for legal record-keeping but
 * unlinked from the login. Open orders/repairs must be finished first.
 */
export async function processAccountDeletion(requestId: string, actorId: string, resolution: string) {
  const req = await prisma.accountDeletionRequest.findUnique({ where: { id: requestId }, include: { user: true } });
  if (!req || req.status !== "PENDING") throw new UserError("This request is not pending.");
  const userId = req.userId;
  const openOrders = await prisma.order.count({ where: { userId, status: { in: ["AWAITING_PAYMENT", "PAYMENT_PROCESSING", "PAID", "COLLECTION_PENDING", "READY_FOR_COLLECTION", "CANCELLATION_REQUESTED", "REFUND_PENDING"] } } });
  const openRepairs = await prisma.repairRequest.count({ where: { userId, status: { in: ACTIVE_REPAIR_STATUSES } } });
  if (openOrders || openRepairs) throw new UserError(`Finish or cancel the customer's open orders (${openOrders}) and repairs (${openRepairs}) first.`);
  const placeholderEmail = `deleted-${userId}@deleted.invalid`;
  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId } });
    await tx.authToken.deleteMany({ where: { userId } });
    await tx.address.deleteMany({ where: { userId } });
    await tx.cartItem.deleteMany({ where: { userId } });
    await tx.wishlistItem.deleteMany({ where: { userId } });
    await tx.customerProfile.deleteMany({ where: { userId } });
    await tx.review.deleteMany({ where: { userId } });
    await tx.productQuestion.deleteMany({ where: { userId } });
    await tx.newsletterSubscription.deleteMany({ where: { email: req.user.email } });
    await tx.repairRequest.updateMany({ where: { userId }, data: { userId: null } });
    await tx.purchaseEnquiry.updateMany({ where: { userId }, data: { userId: null } });
    await tx.contactEnquiry.updateMany({ where: { userId }, data: { userId: null } });
    await tx.notification.updateMany({ where: { userId }, data: { userId: null, recipient: "[deleted]" } });
    await tx.user.update({ where: { id: userId }, data: { name: "Deleted customer", email: placeholderEmail, phone: null, passwordHash: await hashPassword(randomToken(32)), status: "DELETED", emailVerifiedAt: null } });
    await tx.accountDeletionRequest.update({ where: { id: requestId }, data: { status: "COMPLETED", resolution, resolvedById: actorId, resolvedAt: new Date() } });
    await audit({ actorId, action: "account.deleted", entityType: "User", entityId: userId, details: { requestId } }, tx);
  });
}

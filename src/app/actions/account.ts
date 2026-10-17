"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { runAction } from "@/lib/action";
import { requireUser, requireVerifiedUser } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { destroyAllSessions, createSession } from "@/lib/auth/session";
import { enforceRateLimit, limits } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";
import { formToObject, nameSchema, passwordSchema, reviewSchema } from "@/lib/validation";
import { UserError, type ActionResult } from "@/lib/errors";
import { notifyAdmin } from "@/lib/notify";
import { audit } from "@/lib/audit";
import { CUSTOMER_CANCELLABLE, PAID_STATUSES } from "@/lib/shop/order-status";
import { setOrderStatus } from "@/lib/shop/orders";
import { respondToQuote } from "@/lib/repairs/service";
import { repairAmountDue } from "@/lib/repairs/payments";
import { humanReference } from "@/lib/crypto";

export async function updateProfileAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const data = z.object({ name: nameSchema, phone: z.string().trim().max(20).regex(/^[+0-9 ()-]*$/, "Enter a valid phone number").optional() }).parse(formToObject(form));
    await prisma.user.update({ where: { id: user.id }, data: { name: data.name, phone: data.phone ?? null } });
    revalidatePath("/account");
    return { ok: true, message: "Profile saved." };
  });
}

export async function updatePreferencesAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const on = (k: string) => form.get(k) === "on";
    const existing = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
    const whatsappOptIn = on("whatsappOptIn");
    const data = {
      emailOrderUpdates: on("emailOrderUpdates"),
      emailRepairUpdates: on("emailRepairUpdates"),
      emailMarketing: on("emailMarketing"),
      whatsappOptIn,
      whatsappOptInAt: whatsappOptIn ? (existing?.whatsappOptInAt ?? new Date()) : null,
    };
    await prisma.customerProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
    return { ok: true, message: "Notification preferences saved." };
  });
}

export async function changePasswordAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    await enforceRateLimit(`pwchange:${user.id}`, 5, 3600);
    const { current, password } = z.object({ current: z.string().min(1), password: passwordSchema }).parse(formToObject(form));
    const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await verifyPassword(record.passwordHash, current))) return { ok: false, error: "Your current password is incorrect.", fieldErrors: { current: ["Incorrect password"] } };
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
    await destroyAllSessions(user.id);
    await createSession(user.id);
    await audit({ actorId: user.id, action: "auth.password_changed", entityType: "User", entityId: user.id });
    return { ok: true, message: "Password changed. Other devices have been signed out." };
  });
}

export async function addAddressAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const data = z
      .object({ label: z.string().trim().max(40).default("Home"), line1: z.string().trim().min(3).max(120), line2: z.string().trim().max(120).optional(), suburb: z.string().trim().max(80).optional(), city: z.string().trim().min(2).max(80), province: z.string().trim().min(2).max(40), postalCode: z.string().trim().regex(/^\d{4}$/, "4-digit postal code") })
      .parse(formToObject(form));
    if ((await prisma.address.count({ where: { userId: user.id } })) >= 5) throw new UserError("You can save up to 5 addresses.");
    await prisma.address.create({ data: { ...data, userId: user.id } });
    revalidatePath("/account/settings");
    return { ok: true, message: "Address saved." };
  });
}

export async function deleteAddressAction(form: FormData) {
  const user = await requireUser();
  await prisma.address.deleteMany({ where: { id: String(form.get("id")), userId: user.id } });
  revalidatePath("/account/settings");
}

export async function requestOrderCancellationAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const orderId = z.string().parse(form.get("orderId"));
    const reason = z.string().trim().min(5, "Please give a short reason.").max(1000).parse(form.get("reason"));
    const order = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
      const o = await tx.order.findFirst({ where: { id: orderId, userId: user.id } });
      if (!o) throw new UserError("Order not found.", 404);
      if (!CUSTOMER_CANCELLABLE.includes(o.status)) throw new UserError("This order can no longer be cancelled online. Please contact us.");
      await tx.order.update({ where: { id: o.id }, data: { cancellationReason: reason } });
      await setOrderStatus(tx, o, "CANCELLATION_REQUESTED", `Customer requested cancellation: ${reason}`, user.id);
      return o;
    });
    await notifyAdmin("Order cancellation requested", [["Order", order.orderNumber], ["Customer", user.name], ["Reason", reason]], `/admin/orders/${order.id}`);
    revalidatePath(`/account/orders/${orderId}`);
    return { ok: true, message: "Your cancellation request has been sent. The owner will review it and let you know the outcome. Any refund will only be shown as complete once the payment gateway confirms it." };
  });
}

export async function respondToQuoteAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireVerifiedUser();
    const quoteId = z.string().parse(form.get("quoteId"));
    const decision = z.enum(["accept", "decline"]).parse(form.get("decision"));
    if (decision === "accept" && form.get("agree") !== "on") return { ok: false, error: "Please confirm you accept the quote, warranty terms and exclusions." };
    await respondToQuote({ quoteId, accept: decision === "accept", byUserId: user.id, ip: await clientIp() });
    revalidatePath("/account/repairs");
    return { ok: true, message: decision === "accept" ? "Quote accepted — thank you. We'll start the work and keep you updated." : "Quote declined. No work will be done." };
  });
}

/** Creates a gateway payment for the balance due on a completed repair (separate from shop checkout). */
export async function startRepairPaymentAction(form: FormData) {
  const user = await requireVerifiedUser();
  const repairId = z.string().parse(form.get("repairId"));
  const repair = await prisma.repairRequest.findFirst({ where: { id: repairId, userId: user.id } });
  if (!repair || repair.status !== "PAYMENT_DUE") redirect("/account/repairs");
  const { due } = await repairAmountDue(prisma, repair.id);
  if (due < 500) redirect("/account/repairs");
  await prisma.payment.updateMany({ where: { repairRequestId: repair.id, status: "PENDING" }, data: { status: "CANCELLED" } });
  const payment = await prisma.payment.create({ data: { reference: humanReference("RPAY", 8), purpose: "REPAIR", repairRequestId: repair.id, amountCents: due } });
  redirect(`/account/repairs/pay/${payment.id}`);
}

export async function submitReviewAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireVerifiedUser();
    await enforceRateLimit(`review:${user.id}`, limits.review.limit, limits.review.window);
    const data = reviewSchema.parse(formToObject(form));
    let verified = false;
    if (data.subject === "PRODUCT") {
      if (!data.productId) throw new UserError("Choose the item you are reviewing.");
      const bought = await prisma.orderItem.findFirst({ where: { productId: data.productId, order: { userId: user.id, status: { in: PAID_STATUSES } } } });
      if (!bought) throw new UserError("You can review items you have bought from us.");
      verified = true;
      if (await prisma.review.findFirst({ where: { userId: user.id, productId: data.productId } })) throw new UserError("You have already reviewed this item.");
    } else if (data.subject === "REPAIR") {
      if (!data.repairId) throw new UserError("Choose the repair you are reviewing.");
      const repair = await prisma.repairRequest.findFirst({ where: { id: data.repairId, userId: user.id, status: { in: ["COLLECTED", "PAID", "READY_FOR_COLLECTION"] } } });
      if (!repair) throw new UserError("You can review repairs once they are complete.");
      verified = true;
      if (await prisma.review.findFirst({ where: { userId: user.id, repairId: data.repairId } })) throw new UserError("You have already reviewed this repair.");
    } else if ((await prisma.review.count({ where: { userId: user.id, subject: "GENERAL" } })) >= 1) {
      throw new UserError("You have already submitted a general review. Thank you!");
    }
    await prisma.review.create({
      data: { userId: user.id, subject: data.subject, productId: data.subject === "PRODUCT" ? data.productId : null, repairId: data.subject === "REPAIR" ? data.repairId : null, rating: data.rating, title: data.title, body: data.body, displayName: data.displayName, isVerifiedPurchase: verified },
    });
    await notifyAdmin("New review awaiting approval", [["From", user.name], ["Rating", `${data.rating}/5`]], "/admin/reviews");
    return { ok: true, message: "Thank you! Your review has been submitted and will appear once it has been approved." };
  });
}

export async function requestAccountDeletionAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    if (form.get("confirm") !== "DELETE") return { ok: false, error: 'Type DELETE to confirm.' };
    if (await prisma.accountDeletionRequest.findFirst({ where: { userId: user.id, status: "PENDING" } })) return { ok: false, error: "You already have a pending deletion request." };
    const reason = z.string().trim().max(1000).optional().parse(form.get("reason") || undefined);
    await prisma.accountDeletionRequest.create({ data: { userId: user.id, reason } });
    await prisma.user.update({ where: { id: user.id }, data: { status: "DELETION_REQUESTED" } });
    await audit({ actorId: user.id, action: "account.deletion_requested", entityType: "User", entityId: user.id });
    await notifyAdmin("Account deletion requested", [["Customer", `${user.name} <${user.email}>`]], "/admin/customers");
    return { ok: true, message: "Your deletion request has been received. We'll process it and email you to confirm. Records we must keep by law (such as completed order and payment records) are retained but your profile will be anonymised." };
  });
}

export async function submitSupportAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    await enforceRateLimit(`support:${user.id}`, limits.form.limit, limits.form.window);
    const { subject, message } = z.object({ subject: z.string().trim().min(2).max(150), message: z.string().trim().min(10, "Please write a little more").max(4000) }).parse(formToObject(form));
    const reference = humanReference("SUP", 6);
    await prisma.contactEnquiry.create({ data: { reference, userId: user.id, name: user.name, email: user.email, phone: user.phone, subject, message, isSupport: true, privacyConsentAt: new Date() } });
    await notifyAdmin("New support enquiry", [["From", user.name], ["Subject", subject], ["Reference", reference]], "/admin/messages");
    return { ok: true, message: `Support request ${reference} received. We'll reply by email.` };
  });
}

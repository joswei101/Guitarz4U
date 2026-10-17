import { prisma } from "./db";
import { UserError } from "./errors";
import { enquirySchema, formToObject, repairSchema } from "./validation";
import { collectFiles, storeUploads } from "./storage/uploads";
import { getSetting } from "./settings";
import { newEnquiryReference } from "./enquiries/service";
import { newRepairReference } from "./repairs/service";
import { notifyAdmin, sendEmail } from "./notify";
import type { SessionUser } from "./auth/session";

/** Handles a "sell your guitar" submission (fields + private photo/video uploads). */
export async function createPurchaseEnquiry(form: FormData, user: SessionUser | null) {
  const data = enquirySchema.parse(formToObject(form));
  const accepted = await getSetting("sell.acceptedTypes");
  if (!accepted.includes(data.instrumentType)) throw new UserError("We're not currently accepting that type of item.");
  const files = [...collectFiles(form, "photos"), ...collectFiles(form, "video")];
  if (collectFiles(form, "photos").length === 0) throw new UserError("Please add at least one photo of the item.");
  const fileIds = await storeUploads(files, { isPublic: false, ownerUserId: user?.id, prefix: "enquiries" });
  const reference = await newEnquiryReference();
  const enquiry = await prisma.purchaseEnquiry.create({
    data: {
      reference,
      userId: user && user.email.toLowerCase() === data.email.toLowerCase() ? user.id : user?.id ?? null,
      name: data.name,
      email: data.email,
      phone: data.phone,
      instrumentType: data.instrumentType,
      brand: data.brand,
      model: data.model,
      condition: data.condition,
      faults: data.faults,
      details: data.details,
      privacyConsentAt: new Date(),
      media: { create: fileIds.map((fileId) => ({ fileId })) },
      events: { create: { type: "submitted", toStatus: "SUBMITTED", message: "Submission received.", isCustomerVisible: true } },
    },
  });
  const item = [data.brand, data.model].filter(Boolean).join(" ") || data.instrumentType.toLowerCase();
  await sendEmail("enquiryReceived", data.email, { name: data.name, reference, item }, enquiry.userId);
  await notifyAdmin("New sell-your-guitar submission", [["Reference", reference], ["Item", `${data.instrumentType} — ${item}`], ["Seller", `${data.name} (${data.phone})`]], `/admin/enquiries/${enquiry.id}`);
  return enquiry;
}

/** Handles a repair booking/assessment request. No payment is taken at this stage. */
export async function createRepairRequest(form: FormData, user: SessionUser | null) {
  if (!(await getSetting("repairs.acceptingRequests"))) throw new UserError("We're not accepting new repair requests at the moment. Please contact us on WhatsApp.");
  const data = repairSchema.parse(formToObject(form, ["services"]));
  let preferredDate: Date | null = null;
  if (data.preferredDate) {
    preferredDate = new Date(`${data.preferredDate}T09:00:00+02:00`);
    if (Number.isNaN(preferredDate.getTime())) throw new UserError("Please choose a valid preferred date.");
    if (preferredDate.getUTCDay() === 6) throw new UserError("We're closed on Saturdays — please choose another preferred date.");
  }
  const files = [...collectFiles(form, "photos"), ...collectFiles(form, "video")];
  const fileIds = await storeUploads(files, { isPublic: false, ownerUserId: user?.id, prefix: "repairs" });
  const reference = await newRepairReference();
  const repair = await prisma.repairRequest.create({
    data: {
      reference,
      userId: user?.id ?? null,
      name: data.name,
      email: data.email,
      phone: data.phone,
      instrumentType: data.instrumentType,
      brand: data.brand,
      model: data.model,
      problem: data.problem,
      services: data.services,
      notes: data.notes,
      preferredDate,
      preferredTimeNote: data.preferredTimeNote,
      privacyConsentAt: new Date(),
      status: "AWAITING_REVIEW",
      media: { create: fileIds.map((fileId) => ({ fileId })) },
      statusHistory: { create: [{ toStatus: "SUBMITTED", note: "Repair request submitted." }, { fromStatus: "SUBMITTED", toStatus: "AWAITING_REVIEW", note: "Waiting for the owner to review your request." }] },
    },
  });
  const item = [data.brand, data.model].filter(Boolean).join(" ") || data.instrumentType.toLowerCase();
  await sendEmail("repairReceived", data.email, { name: data.name, reference, item }, repair.userId);
  await notifyAdmin("New repair request", [["Reference", reference], ["Instrument", `${data.instrumentType} — ${item}`], ["Services", data.services.join(", ")], ["Customer", `${data.name} (${data.phone})`]], `/admin/repairs/${repair.id}`);
  return repair;
}

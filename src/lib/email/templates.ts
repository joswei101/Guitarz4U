import { appUrl } from "../env";
import { formatZAR } from "../money";
import { site } from "../site";
import type { EmailContent } from "./layout";

const statusFooter = "You are receiving this because of an account, order, enquiry or repair with Guitarz4U.";

export const templates = {
  verifyEmail: (d: { name: string; token: string }): EmailContent => ({
    subject: "Verify your Guitarz4U email address",
    paragraphs: [`Hi ${d.name},`, "Thanks for creating a Guitarz4U account. Please confirm your email address to activate checkout, reviews and repair tracking.", "This link expires in 48 hours."],
    action: { label: "Verify email address", url: appUrl(`/verify-email?token=${encodeURIComponent(d.token)}`) },
    footerNote: "If you did not create this account you can ignore this email.",
  }),
  passwordReset: (d: { name: string; token: string }): EmailContent => ({
    subject: "Reset your Guitarz4U password",
    paragraphs: [`Hi ${d.name},`, "We received a request to reset your password. This link expires in 1 hour and can only be used once."],
    action: { label: "Choose a new password", url: appUrl(`/reset-password?token=${encodeURIComponent(d.token)}`) },
    footerNote: "If you did not request this, you can ignore this email — your password will not change.",
  }),

  enquiryReceived: (d: { name: string; reference: string; item: string }): EmailContent => ({
    subject: `We received your guitar submission (${d.reference})`,
    paragraphs: [`Hi ${d.name},`, `Thank you for offering your ${d.item} to Guitarz4U. Every submission is reviewed personally. If it is something we can buy, we will contact you with an offer or questions. There is no obligation to accept any offer.`],
    details: [["Reference", d.reference]],
    footerNote: statusFooter,
  }),
  enquiryUpdate: (d: { name: string; reference: string; headline: string; message?: string; offerCents?: number }): EmailContent => ({
    subject: `Update on your submission ${d.reference}: ${d.headline}`,
    paragraphs: [`Hi ${d.name},`, d.headline + ".", ...(d.message ? [d.message] : [])],
    details: [["Reference", d.reference], ...(d.offerCents ? ([["Offer", formatZAR(d.offerCents)]] as [string, string][]) : [])],
    action: { label: "Reply on WhatsApp", url: `https://wa.me/${site.whatsappE164}?text=${encodeURIComponent(`Hi Guitarz4U, regarding my submission ${d.reference}: `)}` },
    footerNote: statusFooter,
  }),

  orderConfirmation: (d: { name: string; orderNumber: string; totalCents: number; items: string[] }): EmailContent => ({
    subject: `Payment received — order ${d.orderNumber}`,
    paragraphs: [`Hi ${d.name},`, "Your card payment has been verified and your order is confirmed. Your receipt is available in your account.", "Next step: we will contact you privately to arrange collection in Sandringham, Johannesburg. The exact collection address is shared with you directly and is never published."],
    details: [["Order", d.orderNumber], ["Items", d.items.join(", ")], ["Total paid", formatZAR(d.totalCents)]],
    action: { label: "View order & receipt", url: appUrl(`/account/orders`) },
    footerNote: statusFooter,
  }),
  orderStatus: (d: { name: string; orderNumber: string; statusLabel: string; message?: string }): EmailContent => ({
    subject: `Order ${d.orderNumber}: ${d.statusLabel}`,
    paragraphs: [`Hi ${d.name},`, `Your order status is now: ${d.statusLabel}.`, ...(d.message ? [d.message] : [])],
    action: { label: "View order", url: appUrl(`/account/orders`) },
    footerNote: statusFooter,
  }),

  repairReceived: (d: { name: string; reference: string; item: string }): EmailContent => ({
    subject: `Repair request received (${d.reference})`,
    paragraphs: [`Hi ${d.name},`, `Thanks for your repair request for your ${d.item}. The owner reviews every request personally and will let you know whether the job can be accepted for assessment. No payment is due now — repairs are only paid for after the work is completed and only according to a quote you have approved.`],
    details: [["Reference", d.reference]],
    action: { label: "Track your repair", url: appUrl(`/repairs/track?ref=${encodeURIComponent(d.reference)}`) },
    footerNote: statusFooter,
  }),
  repairQuote: (d: { name: string; reference: string; totalCents: number; labourCents: number; partsCents: number }): EmailContent => ({
    subject: `Your repair quote is ready (${d.reference})`,
    paragraphs: [`Hi ${d.name},`, "Your repair quote is ready. Please review the quote, warranty terms and exclusions, then accept or decline it. Work only begins after you accept."],
    details: [["Reference", d.reference], ["Labour", formatZAR(d.labourCents)], ["Parts", formatZAR(d.partsCents)], ["Quote total", formatZAR(d.totalCents)]],
    action: { label: "Review quote", url: appUrl(`/account/repairs`) },
    footerNote: statusFooter,
  }),
  repairStatus: (d: { name: string; reference: string; statusLabel: string; message?: string; amountDueCents?: number }): EmailContent => ({
    subject: `Repair ${d.reference}: ${d.statusLabel}`,
    paragraphs: [`Hi ${d.name},`, `Your repair status is now: ${d.statusLabel}.`, ...(d.message ? [d.message] : [])],
    details: [["Reference", d.reference], ...(d.amountDueCents ? ([["Amount due", formatZAR(d.amountDueCents)]] as [string, string][]) : [])],
    action: { label: "View repair", url: appUrl(`/account/repairs`) },
    footerNote: statusFooter,
  }),

  contactReceived: (d: { name: string; reference: string }): EmailContent => ({
    subject: `We received your message (${d.reference})`,
    paragraphs: [`Hi ${d.name},`, "Thanks for getting in touch with Guitarz4U. We will reply as soon as we can. Please note that we are closed on Saturdays."],
    details: [["Reference", d.reference]],
  }),
  newsletterConfirm: (d: { token: string }): EmailContent => ({
    subject: "Confirm your Guitarz4U newsletter subscription",
    paragraphs: ["Please confirm that you would like to receive occasional emails from Guitarz4U about new stock and services. You can unsubscribe at any time."],
    action: { label: "Confirm subscription", url: appUrl(`/newsletter/confirm?token=${encodeURIComponent(d.token)}`) },
    footerNote: "If you did not sign up, ignore this email and you will not be subscribed.",
  }),
  questionAnswered: (d: { name: string; productTitle: string; slug: string }): EmailContent => ({
    subject: `Your question about ${d.productTitle} has been answered`,
    paragraphs: [`Hi ${d.name},`, `Your question about the ${d.productTitle} has been answered.`],
    action: { label: "View answer", url: appUrl(`/shop/${d.slug}#questions`) },
  }),

  adminAlert: (d: { title: string; lines: [string, string][]; path: string }): EmailContent => ({
    subject: `[Guitarz4U admin] ${d.title}`,
    paragraphs: [d.title],
    details: d.lines,
    action: { label: "Open in dashboard", url: appUrl(d.path) },
  }),
};

export type TemplateName = keyof typeof templates;

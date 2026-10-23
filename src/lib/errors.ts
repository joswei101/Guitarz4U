// Maps database error codes raised by our SQL functions to friendly messages.

const MESSAGES: Record<string, string> = {
  LOGIN_REQUIRED: "Please sign in to continue.",
  NOT_AUTHORISED: "You do not have permission to do that.",
  RATE_LIMITED: "You have made several requests in a short time. Please wait a while and try again.",
  EMPTY_REQUEST: "Your request cart is empty.",
  TOO_MANY_ITEMS: "Please request no more than 10 items at a time.",
  CONTACT_REQUIRED: "Please provide an email address or a phone number.",
  PRODUCT_UNAVAILABLE: "Sorry, this item is no longer available",
  DUPLICATE_REQUEST: "You already have an open request for this item",
  CANNOT_CANCEL: "This can no longer be cancelled online.",
  NOT_FOUND: "We could not find that record.",
  PRIVACY_ACK_REQUIRED: "Please acknowledge the privacy notice.",
  LOOSE_PARTS_NOT_ACCEPTED: "We do not buy loose guitar parts on their own.",
  TOO_MANY_IMAGES: "Too many photographs. Please remove some and try again.",
  INVALID_IMAGE_PATH: "One of the uploaded photographs could not be verified. Please upload it again.",
  OFFER_NOT_PENDING: "This offer is no longer open.",
  DATE_IN_PAST: "The preferred date cannot be in the past.",
  QUOTE_NOT_PENDING: "This quote is no longer awaiting a response.",
  REVIEW_PENDING: "You already have a review awaiting moderation.",
  REVIEW_LOOKS_LIKE_SPAM: "Your review was flagged by our spam filter. Please remove links and try again.",
  ENQUIRY_LOOKS_LIKE_SPAM: "Your message was flagged by our spam filter. Please remove links and try again.",
  INVALID_TRANSITION: "That status change is not allowed from the current status.",
  REQUEST_CLOSED: "This request is closed.",
  RESERVATION_CONFLICT: "Another reservation for this product is already approved.",
  INVALID_AMOUNT: "Please enter a valid amount.",
  CANNOT_ANONYMISE_SELF: "You cannot delete your own administrator account here.",
};

type DbError = { message?: string; details?: string | null; hint?: string | null; code?: string } | null | undefined;

export function friendlyError(error: DbError, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  const code = (error.message || "").trim();
  const base = MESSAGES[code];
  if (base) {
    const detail = error.details?.trim();
    return detail ? `${base}: ${detail}.`.replace(/\.\.$/, ".") : base.endsWith(".") ? base : `${base}.`;
  }
  if (error.code === "23514") return "Some of the information provided is not valid. Please check the form.";
  if (error.code === "23505") return "That record already exists.";
  if (error.code === "42501") return "You do not have permission to do that.";
  console.error("Unhandled database error", error);
  return fallback;
}

const MESSAGES: Record<string, { tone: "good" | "bad" | "info"; text: string }> = {
  saved: { tone: "good", text: "Your changes have been saved." },
  cancelled: { tone: "good", text: "Cancelled. Guitarz4U has been notified." },
  accepted: { tone: "good", text: "Thank you — your response has been sent to Guitarz4U." },
  declined: { tone: "info", text: "Your response has been sent to Guitarz4U." },
  requested: { tone: "good", text: "Your request has been sent to Guitarz4U." },
  notallowed: { tone: "bad", text: "That action is no longer possible for this item." },
  denied: { tone: "bad", text: "You do not have access to that page." },
  error: { tone: "bad", text: "Something went wrong. Please try again." },
  created: { tone: "good", text: "Created successfully." },
  deleted: { tone: "good", text: "Deleted." },
  inuse: { tone: "bad", text: "This product is linked to requests or reservations, so it cannot be deleted. Archive it instead — that keeps the business record." },
  badamount: { tone: "bad", text: "Please enter a valid amount in rand." },
  needpayment: { tone: "bad", text: "Record the EFT payment as received first (after checking your bank account) before moving to collection or completion." },
  needconfirm: { tone: "bad", text: "Please tick the confirmation box to continue." },
  payment: { tone: "good", text: "Payment recorded as received. The customer has been notified." },
  conflict: { tone: "bad", text: "That guitar is not available to reserve (it may already be reserved, sold or hidden)." },
  needquote: { tone: "bad", text: "Provide a quote before approving or starting the repair." },
};

export function Flash({ msg }: { msg?: string }) {
  const m = msg ? MESSAGES[msg] : undefined;
  if (!m) return null;
  return (
    <div className={`notice notice-${m.tone}`} role="status" style={{ marginBottom: 16 }}>
      <p>{m.text}</p>
    </div>
  );
}

/** Convert a South African number (e.g. "064 856 7019") to international digits ("27648567019"). */
export function toInternational(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("27")) return digits;
  if (digits.startsWith("0")) return "27" + digits.slice(1);
  return digits;
}

/** Ordinary WhatsApp click-to-chat link (free; opens WhatsApp with a pre-filled message). */
export function whatsappLink(phone: string, message?: string) {
  const base = `https://wa.me/${toInternational(phone)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function displayPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("0")) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return phone;
}

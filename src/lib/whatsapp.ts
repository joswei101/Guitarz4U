/**
 * WhatsApp "click to chat" links. These OPEN WhatsApp with a pre-filled
 * message; the person still has to press Send. Nothing is sent automatically,
 * and opening the link does not mean a message was delivered.
 */
export function waLink(internationalNumber: string, message?: string): string {
  const digits = internationalNumber.replace(/\D/g, '');
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Converts a South African number like 064 856 7019 to 27648567019. */
export function toInternationalZA(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0') && d.length === 10) d = '27' + d.slice(1);
  if (d.length < 9 || d.length > 15) return null;
  return d;
}

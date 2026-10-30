import { WhatsAppIcon } from '@/components/icons';
import { toInternationalZA, waLink } from '@/lib/whatsapp';

/**
 * Opens WhatsApp with a ready-written message to the customer. The owner must
 * still press Send in WhatsApp — the website cannot confirm delivery.
 */
export function WhatsAppTo({ phone, message, label = 'WhatsApp customer' }: { phone: string | null | undefined; message: string; label?: string }) {
  const intl = toInternationalZA(phone);
  if (!intl) return <span className="small muted">No valid WhatsApp number</span>;
  return (
    <a className="btn btn-whatsapp btn-small" href={waLink(intl, message)} target="_blank" rel="noopener noreferrer" title="Opens WhatsApp with this message ready — you still need to press Send">
      <WhatsAppIcon /> {label}
    </a>
  );
}

export function MailTo({ email, subject, body }: { email: string; subject: string; body?: string }) {
  return <a className="btn btn-outline btn-small" href={`mailto:${email}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`}>Email customer</a>;
}

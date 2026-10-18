import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { whatsappLink } from "@/lib/whatsapp";

export function ContactCard({
  name,
  phone,
  email,
  preferred,
  userId,
  waMessage,
}: {
  name: string;
  phone: string | null;
  email: string | null;
  preferred: string;
  userId: string | null;
  waMessage: string;
}) {
  return (
    <section className="card p-5">
      <h2 className="text-lg">Customer</h2>
      <p className="mt-2 font-semibold">{name}</p>
      <p className="text-sm text-tan">Prefers: {preferred}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {phone && (
          <li className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gold" aria-hidden />
            <a href={`tel:${phone.replace(/\s/g, "")}`} className="link">{phone}</a>
          </li>
        )}
        {email && (
          <li className="flex items-center gap-2 break-all">
            <Mail className="h-4 w-4 flex-none text-gold" aria-hidden />
            <a href={`mailto:${email}`} className="link">{email}</a>
          </li>
        )}
      </ul>
      {phone && (
        <a href={whatsappLink(phone, waMessage)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm mt-4 w-full">
          <WhatsAppIcon className="h-4 w-4" /> Open WhatsApp chat
        </a>
      )}
      <p className="mt-2 text-xs text-tan">Opens WhatsApp with a draft message — you send it yourself.</p>
      {userId && <Link href={`/admin/customers/${userId}`} className="link mt-3 inline-block text-sm">Customer history</Link>}
    </section>
  );
}

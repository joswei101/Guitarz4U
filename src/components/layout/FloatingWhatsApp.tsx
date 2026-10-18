"use client";
import { usePathname } from "next/navigation";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { whatsappLink } from "@/lib/whatsapp";
import { track } from "@/lib/track";

export function FloatingWhatsApp({ phone }: { phone: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <a
      href={whatsappLink(phone, "Hi Guitarz4U, I have a question.")}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("whatsapp_click")}
      className="fixed bottom-4 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#1f7a4d] text-white shadow-[var(--shadow-lift)] transition-transform hover:scale-105 print:hidden"
      aria-label="Chat with Guitarz4U on WhatsApp (opens WhatsApp)"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}

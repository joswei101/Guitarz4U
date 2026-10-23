"use client";

import { WhatsAppIcon } from "@/components/ui/Icons";
import { trackEvent } from "@/lib/analytics-client";
import { whatsappLink } from "@/lib/format";

export function WhatsAppButton({ number }: { number: string }) {
  return (
    <a
      href={whatsappLink(number, "Hi Guitarz4U, I have a question.")}
      target="_blank"
      rel="noopener"
      onClick={() => trackEvent("whatsapp_click")}
      className="fixed bottom-4 right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#1f7a4a] text-white shadow-lg ring-4 ring-white/70 transition-transform hover:scale-105 hover:bg-[#17603a] sm:bottom-6 sm:right-6"
      aria-label="Chat with Guitarz4U on WhatsApp (opens WhatsApp)"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}

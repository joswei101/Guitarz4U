import { getSettings, whatsappLink } from "@/lib/settings";
import { IconWhatsApp } from "./icons";

export async function WhatsAppFloat() {
  const s = await getSettings();
  return (
    <a
      className="wa-float"
      href={whatsappLink(s.whatsappNumber, "Hi Guitarz4U, I have a question: ")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat to Guitarz4U on WhatsApp (${s.whatsappNumber})`}
      data-track="whatsapp_click"
    >
      <IconWhatsApp />
    </a>
  );
}

import Link from "next/link";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { whatsappLink } from "@/lib/whatsapp";

export function SignInPrompt({ next, purpose, whatsapp, waMessage }: { next: string; purpose: string; whatsapp: string; waMessage: string }) {
  return (
    <div className="space-y-4">
      <p>
        Please sign in or create a free account to {purpose}. Your account lets you track progress, receive updates and
        respond to us in one place.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn btn-primary">
          Sign in
        </Link>
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="btn btn-outline">
          Create an account
        </Link>
      </div>
      <div className="rounded-lg bg-cream-2 p-4">
        <p className="font-semibold">Prefer not to use the form?</p>
        <p className="text-sm">Send us the details and a few photos on WhatsApp instead.</p>
        <a href={whatsappLink(whatsapp, waMessage)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp mt-3">
          <WhatsAppIcon /> Continue on WhatsApp
        </a>
      </div>
    </div>
  );
}

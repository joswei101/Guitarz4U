import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { getProfile, getUser } from "@/lib/auth";
import { getCategories } from "@/lib/data/products";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { SellForm } from "@/components/forms/SellForm";
import { SignInPrompt } from "@/components/forms/SignInPrompt";
import { HOW_IT_WORKS } from "@/content/copy";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Sell your guitar in Johannesburg",
  description:
    "Sell your second-hand electric, bass, acoustic or classical guitar to Guitarz4U — working or broken. Personal assessment and a no-obligation offer.",
  alternates: { canonical: "/sell" },
};

const WA_MSG = "Hi Guitarz4U, I'd like to sell my guitar. Brand/model: … Condition: … (photos attached)";

export default async function SellPage() {
  const [user, profile, categories, settings] = await Promise.all([getUser(), getProfile(), getCategories(), getSettings()]);
  const guitarCategories = categories.filter((c) => c.kind === "guitar" && c.active);
  return (
    <>
      <PageHeader eyebrow="Sell to Guitarz4U" title="Sell your guitar">
        Got a guitar that deserves a new home? We buy pre-owned electric, bass, acoustic and classical guitars —
        working or broken — and make personal, no-obligation offers.
      </PageHeader>
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_380px]">
        <section className="card p-6 sm:p-8" aria-labelledby="form-h">
          <h2 id="form-h" className="text-2xl">
            Tell us about your guitar
          </h2>
          <div className="mt-6">
            {user ? (
              <SellForm
                userId={user.id}
                categories={guitarCategories}
                defaults={{ name: profile?.full_name, phone: profile?.phone, email: user.email, preferred: profile?.preferred_contact }}
              />
            ) : (
              <SignInPrompt next="/sell" purpose="submit your guitar" whatsapp={settings.whatsapp_number} waMessage={WA_MSG} />
            )}
          </div>
        </section>
        <aside className="space-y-6">
          <div className="card p-6">
            <h2 className="text-xl">What we buy</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {["Electric guitars", "Bass guitars", "Acoustic guitars", "Classical guitars", "Broken guitars (for consideration)"].map((t) => (
                <li key={t} className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 flex-none text-success" aria-hidden /> {t}
                </li>
              ))}
              <li className="flex gap-2">
                <XCircle className="h-5 w-5 flex-none text-danger" aria-hidden /> Loose guitar parts on their own
              </li>
            </ul>
          </div>
          <div className="card p-6">
            <h2 className="text-xl">How selling works</h2>
            <ol className="mt-3 space-y-3 text-sm">
              {HOW_IT_WORKS.selling.map((s, i) => (
                <li key={s.title}>
                  <span className="font-semibold">
                    {i + 1}. {s.title}
                  </span>
                  <p className="text-walnut/80">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="card p-6">
            <h2 className="text-xl">Prefer WhatsApp?</h2>
            <p className="mt-2 text-sm">Send the brand, model, condition and a few photos.</p>
            <a href={whatsappLink(settings.whatsapp_number, WA_MSG)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp mt-4">
              <WhatsAppIcon /> WhatsApp us
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}

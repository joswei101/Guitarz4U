import type { Metadata } from "next";
import { Cable, Guitar, Hammer, Music2, Ruler, Settings2, Wrench } from "lucide-react";
import { getProfile, getUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { RepairForm } from "@/components/forms/RepairForm";
import { SignInPrompt } from "@/components/forms/SignInPrompt";
import { HOW_IT_WORKS, REPAIRS_INTRO_DEFAULT } from "@/content/copy";
import { REPAIR_SERVICES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Guitar repairs & setups in Johannesburg",
  description:
    "Guitar repairs in Johannesburg: string replacement, setups, electronics, body and hardware repairs and fretwork. Personal assessment and a quote before any work begins.",
  alternates: { canonical: "/repairs" },
};

const ICONS = { strings: Music2, setup: Settings2, electronics: Cable, body: Guitar, hardware: Wrench, fretwork: Ruler, other: Hammer } as const;

export default async function RepairsPage({ searchParams }: PageProps<"/repairs">) {
  const sp = await searchParams;
  const [user, profile, settings] = await Promise.all([getUser(), getProfile(), getSettings()]);
  const prices = settings.repair_prices ?? [];
  const preselect = typeof sp.service === "string" ? sp.service : undefined;
  return (
    <>
      <PageHeader eyebrow="Guitar repairs" title="Guitar repairs & setups">
        {settings.repairs_intro || REPAIRS_INTRO_DEFAULT}
      </PageHeader>

      <section className="section !pb-6" aria-labelledby="services-h">
        <div className="container-page">
          <h2 id="services-h" className="text-3xl">
            Repair services
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {REPAIR_SERVICES.map((s) => {
              const Icon = ICONS[s.value];
              const price = prices.find((p) => p.service === s.value);
              return (
                <li key={s.value} className="card flex flex-col p-5">
                  <Icon className="h-7 w-7 text-gold" aria-hidden />
                  <h3 className="mt-3 text-lg">{s.label}</h3>
                  <p className="mt-1 flex-1 text-sm text-walnut/80">{s.description}</p>
                  <p className="mt-3 text-sm font-semibold">
                    {price ? (
                      <>
                        {price.price}
                        {price.note && <span className="block font-normal text-tan">{price.note}</span>}
                      </>
                    ) : (
                      <span className="text-tan">Quoted after assessment</span>
                    )}
                  </p>
                  <a href={`/repairs?service=${s.value}#book`} className="link mt-3 text-sm font-semibold">
                    Book this repair
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm text-tan">
            Repair prices are assessed personally for each guitar. Any prices shown are guides unless stated otherwise;
            you&apos;ll always receive a quotation before work begins.
          </p>
        </div>
      </section>

      <section className="section !pt-8">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_360px]">
          <div id="book" className="card scroll-mt-24 p-6 sm:p-8">
            <h2 className="text-2xl">Book a repair</h2>
            <div className="mt-6">
              {user ? (
                <RepairForm
                  userId={user.id}
                  preselect={preselect}
                  defaults={{ name: profile?.full_name, phone: profile?.phone, email: user.email, preferred: profile?.preferred_contact }}
                />
              ) : (
                <SignInPrompt
                  next="/repairs#book"
                  purpose="book a repair"
                  whatsapp={settings.whatsapp_number}
                  waMessage="Hi Guitarz4U, I'd like to book a guitar repair. Guitar: … Problem: …"
                />
              )}
            </div>
          </div>
          <aside className="card h-fit p-6">
            <h2 className="text-xl">How repairs work</h2>
            <ol className="mt-3 space-y-3 text-sm">
              {HOW_IT_WORKS.repairs.map((s, i) => (
                <li key={s.title}>
                  <span className="font-semibold">
                    {i + 1}. {s.title}
                  </span>
                  <p className="text-walnut/80">{s.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm font-semibold">{settings.closed_notice}</p>
          </aside>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/lib/products";
import { getSettings, whatsappLink } from "@/lib/settings";
import { getCurrentUser } from "@/lib/session";
import { REPAIR_SERVICES } from "@/lib/format";
import { PageHead } from "@/components/ui";
import { IconWrench, IconWhatsApp } from "@/components/icons";
import { RepairForm } from "./RepairForm";

export const metadata: Metadata = {
  title: "Guitar repairs, setups & restrings in Johannesburg",
  description: "Book a guitar repair with Guitarz4U in Sandringham, Johannesburg: string replacement, setups, electronics, body and hardware repairs, and fretwork. Personal assessment and quote before any work.",
  alternates: { canonical: "/repairs" },
};
export const dynamic = "force-dynamic";

const SERVICE_TEXT: Record<string, string> = {
  strings: "Fresh strings of your choice, cleaned fretboard and tuned up.",
  setup: "Neck relief, action, intonation and pickup height adjusted for comfortable playing.",
  electronics: "Crackling pots, dead jacks, switches, wiring and pickup installs.",
  body: "Cracks, chips, finish touch-ups and structural repairs.",
  hardware: "Tuners, bridges, nuts, saddles, tremolos and strap buttons.",
  fretwork: "Fret levelling, crowning, polishing and fret replacement.",
  other: "Something else? Describe the problem and we will take a look.",
};

export default async function RepairsPage() {
  const [categories, s, user] = await Promise.all([getCategories(), getSettings(), getCurrentUser()]);
  return (
    <>
      <PageHead title="Guitar repairs & setups" eyebrow="Repairs" intro={s.repairsIntro} crumbs={[{ label: "Repairs" }]} />
      <section className="section-tight">
        <div className="wrap">
          <div className="grid-3">
            {Object.entries(REPAIR_SERVICES).map(([k, label]) => (
              <div key={k} className="card feature">
                <div className="feature-icon"><IconWrench /></div>
                <h3>{label}</h3>
                <p className="muted" style={{ margin: 0 }}>{SERVICE_TEXT[k]}</p>
              </div>
            ))}
          </div>
          {s.repairPricesNote ? (
            <div className="notice" style={{ marginTop: 20 }}><strong>Pricing</strong><p className="pre-line">{s.repairPricesNote}</p></div>
          ) : (
            <div className="notice" style={{ marginTop: 20 }}>
              <strong>How pricing works</strong>
              <p>Every guitar is different, so we assess your guitar and send you a quote first. No work starts until you have approved the quote. Your preferred date is a request — we confirm the actual date with you personally.</p>
            </div>
          )}
        </div>
      </section>
      <section className="section-tight" id="book">
        <div className="wrap detail-grid">
          <RepairForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} defaults={user ? { name: user.name, email: user.email } : undefined} />
          <aside className="stack">
            <div className="card">
              <h2 style={{ fontSize: "1.25rem" }}>Repair process</h2>
              <ol className="steps">
                <li>Send your booking with photos and a description.</li>
                <li>We review it and may ask for more details.</li>
                <li>We send you a quote. You accept or decline it.</li>
                <li>We confirm a drop-off date personally.</li>
                <li>We let you know when your guitar is ready for collection.</li>
              </ol>
            </div>
            <div className="card">
              <p>Questions first? Chat to us.</p>
              <a className="btn btn-whatsapp btn-block" href={whatsappLink(s.whatsappNumber, "Hi Guitarz4U, I have a question about a guitar repair: ")} target="_blank" rel="noopener noreferrer" data-track="whatsapp_click">
                <IconWhatsApp /> WhatsApp about a repair
              </a>
            </div>
            <p className="small"><Link href="/track">Track an existing repair →</Link></p>
          </aside>
        </div>
      </section>
    </>
  );
}

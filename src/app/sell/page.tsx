import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/lib/products";
import { getSettings, whatsappLink } from "@/lib/settings";
import { getCurrentUser } from "@/lib/session";
import { PageHead } from "@/components/ui";
import { IconWhatsApp } from "@/components/icons";
import { SellForm } from "./SellForm";

export const metadata: Metadata = {
  title: "Sell your guitar in Johannesburg",
  description: "Sell your second-hand guitar to Guitarz4U — working, broken or incomplete electric, bass, acoustic and classical guitars. Submit photos and details for a personal review.",
  alternates: { canonical: "/sell" },
};
export const dynamic = "force-dynamic";

export default async function SellPage() {
  const [categories, s, user] = await Promise.all([getCategories(), getSettings(), getCurrentUser()]);
  return (
    <>
      <PageHead title="Sell your guitar to Guitarz4U" eyebrow="We buy guitars" intro={s.sellIntro} crumbs={[{ label: "Sell your guitar" }]} />
      <div className="wrap section-tight">
        <div className="detail-grid">
          <div>
            <SellForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} defaults={user ? { name: user.name, email: user.email } : undefined} />
          </div>
          <aside className="stack">
            <div className="card">
              <h2 style={{ fontSize: "1.3rem" }}>What we buy</h2>
              <ul>
                <li>Electric, bass, acoustic and classical guitars</li>
                <li>Working guitars, guitars that need repairs, and incomplete guitars</li>
                <li><strong>Not</strong> loose parts on their own (pickups, necks, bodies, hardware)</li>
              </ul>
              <h3>What happens next</h3>
              <ol className="steps" style={{ marginTop: 10 }}>
                <li>We review your details and photos personally.</li>
                <li>We may ask for more information or photos.</li>
                <li>If we are interested, we make you a personal offer — you are free to accept or decline.</li>
                <li>We arrange an inspection and payment with you directly.</li>
              </ol>
              <p className="small muted" style={{ marginTop: 12 }}>Submitting a guitar is not an offer or a promise to buy. Guitarz4U decides which guitars to buy and the amount offered.</p>
            </div>
            <div className="card">
              <h2 style={{ fontSize: "1.2rem" }}>Prefer WhatsApp?</h2>
              <p>Send us your guitar&apos;s brand, model, condition and a few photos on WhatsApp.</p>
              <a className="btn btn-whatsapp btn-block" href={whatsappLink(s.whatsappNumber, "Hi Guitarz4U, I would like to sell my guitar. Brand/model: ... Condition: ... Does it work: ... (photos attached)")} target="_blank" rel="noopener noreferrer" data-track="whatsapp_click">
                <IconWhatsApp /> Submit on WhatsApp
              </a>
            </div>
            <p className="small"><Link href="/track">Already submitted? Track your submission →</Link></p>
          </aside>
        </div>
      </div>
    </>
  );
}

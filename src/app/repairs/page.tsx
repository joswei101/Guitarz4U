import type { Metadata } from "next";
import Link from "next/link";
import { REPAIR_INSTRUMENTS, REPAIR_SERVICES } from "@/lib/repairs/status";
import { ButtonLink } from "@/components/ui/button";
import { Card, PageHeader, SectionHeading } from "@/components/ui/misc";
import { WrenchIcon } from "@/components/layout/icons";

export const metadata: Metadata = {
  title: "Guitar & amplifier repairs in Johannesburg",
  description: "Guitar setups, electronics, fretwork, nut and saddle, pickups and amp repairs in Sandringham, Johannesburg. Inspected and quoted before work begins.",
  alternates: { canonical: "/repairs" },
};

const DETAIL: Record<string, string> = {
  "String replacement": "Fresh strings of your choice, cleaned fretboard and a quick tune-up.",
  "Guitar setup and action adjustment": "Truss rod, action, radius and pickup heights adjusted for comfortable, buzz-free playing.",
  "Pickup and electronics repairs": "Crackling pots, dead pickups, noisy circuits and intermittent faults diagnosed and fixed.",
  "Wiring and soldering": "Rewiring, cold joints and custom wiring schemes done neatly and safely.",
  "Jack socket and switch repairs": "Loose or crackling output jacks and selector switches repaired or replaced.",
  "Hardware replacement": "Tuners, bridges, saddles, strap buttons and other hardware fitted.",
  "Intonation and tuning issues": "Saddle adjustments and diagnosis of tuning stability problems.",
  "Fault diagnosis": "Not sure what's wrong? We'll inspect it and explain the options.",
  "Damaged and broken guitar repairs": "Headstock breaks, cracks and structural damage assessed case by case.",
  "Fretwork and fret replacement": "Levelling, crowning, polishing and fret replacement.",
  "Nut and saddle replacement": "Bone or synthetic nuts and saddles cut and fitted.",
  "Pickup installation and upgrades": "Swap or upgrade pickups and electronics.",
  "Cleaning and maintenance": "Deep clean, fretboard conditioning and hardware polish.",
  "Custom modifications": "Coil splits, kill switches and other mods — subject to approval.",
};

export default function RepairsPage() {
  return (
    <>
      <PageHeader eyebrow="Workshop" title="Guitar & amp repairs">
        Honest repairs by a working musician. Every request is reviewed by the owner, every instrument is inspected, and no work starts until you approve a written quote. You pay only once the repair is complete.
      </PageHeader>
      <div className="container space-y-16 py-12">
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/repairs/book" size="lg">Request an assessment</ButtonLink>
          <ButtonLink href="/repairs/track" size="lg" variant="outline">Track a repair</ButtonLink>
        </div>
        <section>
          <SectionHeading eyebrow="Services" title="What we repair" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REPAIR_SERVICES.filter((s) => DETAIL[s]).map((s) => (
              <Card key={s}>
                <WrenchIcon className="h-6 w-6 text-amp" />
                <h3 className="mt-3 font-display text-lg uppercase tracking-wide">{s}</h3>
                <p className="mt-1 text-sm text-bone-muted">{DETAIL[s]}</p>
                <Link href={`/repairs/book?service=${encodeURIComponent(s)}`} className="link mt-3 inline-block text-sm">Request this →</Link>
              </Card>
            ))}
          </div>
        </section>
        <section className="grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Instruments" title="What we work on" />
            <ul className="space-y-2 text-bone-muted">{REPAIR_INSTRUMENTS.map((i) => <li key={i}>• {i}</li>)}</ul>
          </div>
          <div>
            <SectionHeading eyebrow="Process" title="How repairs work" />
            <ol className="space-y-3 text-sm text-bone-muted">
              <li><strong className="text-bone">1. Request.</strong> Send photos and describe the problem. No payment now.</li>
              <li><strong className="text-bone">2. Review.</strong> The owner decides whether the job can be taken on. Some repairs may be declined if they can&apos;t reasonably be completed.</li>
              <li><strong className="text-bone">3. Drop-off & inspection.</strong> Arranged privately — we don&apos;t publish our address.</li>
              <li><strong className="text-bone">4. Quote.</strong> Labour, parts (paid by you), warranty terms and exclusions — all in writing.</li>
              <li><strong className="text-bone">5. Your approval.</strong> Work begins only after you accept the quote.</li>
              <li><strong className="text-bone">6. Repair, payment & collection.</strong> Track progress online, pay once it&apos;s done, then collect.</li>
            </ol>
            <p className="mt-4 text-xs text-bone-dim">Each repair includes a limited warranty on the work done, with the duration set on your quote. See the <Link href="/policies/repair-terms" className="link">repair terms</Link>.</p>
          </div>
        </section>
      </div>
    </>
  );
}

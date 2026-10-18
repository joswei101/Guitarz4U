import { getSettings, DEFAULT_SETTINGS, type SiteSettings } from "@/lib/settings";
import { Flash } from "@/components/Flash";
import { saveSettings } from "../actions";

const FIELDS: { key: keyof SiteSettings; label: string; hint?: string; long?: boolean }[] = [
  { key: "announcement", label: "Announcement bar", hint: "Optional short message shown at the top of every page. Leave empty to hide." },
  { key: "heroHeading", label: "Home page heading" },
  { key: "heroText", label: "Home page introduction", long: true },
  { key: "aboutText", label: "About page text", hint: "Separate paragraphs with a blank line.", long: true },
  { key: "sellIntro", label: "Sell page introduction", long: true },
  { key: "repairsIntro", label: "Repairs page introduction", long: true },
  { key: "repairPricesNote", label: "Repair prices (optional)", hint: "Leave empty to show “quote first” wording. Only add fixed prices you are happy to publish.", long: true },
  { key: "tagline", label: "Tagline" },
  { key: "whatsappNumber", label: "WhatsApp number", hint: "Used for every WhatsApp button, e.g. 064 856 7019." },
  { key: "email", label: "Public email address" },
  { key: "socialHandle", label: "Social media handle (without @)" },
  { key: "socialUrl", label: "Social media profile link", hint: "Full https:// link. Leave empty to show the handle as text only." },
  { key: "locationLine", label: "Public location", hint: "Area only — never your street address." },
  { key: "hoursNotice", label: "Opening notice", hint: "Business hours are not published; this is the only notice shown." },
  { key: "reservationDays", label: "Default reservation hold (days)" },
];

export default async function AdminContent({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  return (
    <div className="stack">
      <Flash msg={sp.msg} />
      <h1 style={{ fontSize: "2rem" }}>Website content &amp; settings</h1>
      <p className="muted">Changes appear on the website immediately. Do not enter bank details or your street address here — this content is public.</p>
      <form action={saveSettings} className="card form">
        {FIELDS.map((f) => (
          <div className="field" key={f.key}>
            <label htmlFor={f.key}>{f.label}</label>
            {f.long ? (
              <textarea id={f.key} name={f.key} rows={5} defaultValue={String(s[f.key])} maxLength={6000} />
            ) : (
              <input id={f.key} name={f.key} type={typeof DEFAULT_SETTINGS[f.key] === "number" ? "number" : "text"} defaultValue={String(s[f.key])} maxLength={300} />
            )}
            {f.hint && <span className="hint">{f.hint}</span>}
          </div>
        ))}
        <button className="btn btn-primary">Save content</button>
      </form>
    </div>
  );
}

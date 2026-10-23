import Link from "next/link";
import { whatsappLink } from "@/lib/format";
import { MailIcon, WhatsAppIcon } from "@/components/ui/Icons";

export function AdminPageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl">{title}</h1>
        {description && <div className="mt-1 max-w-3xl text-sm text-ink-soft">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatusFilter({ base, current, options }: { base: string; current?: string; options: { value: string; label: string; count?: number }[] }) {
  return (
    <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-1.5">
      <Link href={base} className={`rounded-full px-3 py-1.5 text-sm no-underline ${!current ? "bg-walnut text-cream-light" : "bg-white text-walnut hover:bg-cream"}`}>
        All open
      </Link>
      {options.map((o) => (
        <Link
          key={o.value}
          href={`${base}?status=${o.value}`}
          className={`rounded-full px-3 py-1.5 text-sm no-underline ${current === o.value ? "bg-walnut text-cream-light" : "bg-white text-walnut hover:bg-cream"}`}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

/** Quick links for contacting a customer privately. */
export function ContactLinks({ name, phone, email, context }: { name: string; phone?: string | null; email?: string | null; context: string }) {
  const greeting = `Hi ${name.split(" ")[0]}, this is Guitarz4U regarding ${context}.`;
  return (
    <div className="flex flex-wrap gap-2">
      {phone && (
        <a href={whatsappLink(phone, greeting)} target="_blank" rel="noopener" className="btn btn-whatsapp btn-sm">
          <WhatsAppIcon className="h-4 w-4" /> WhatsApp
        </a>
      )}
      {phone && (
        <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="btn btn-outline btn-sm">
          Call
        </a>
      )}
      {email && email !== "deleted@invalid" && (
        <a href={`mailto:${email}?subject=${encodeURIComponent(`Guitarz4U — ${context}`)}&body=${encodeURIComponent(greeting + "\n\n")}`} className="btn btn-outline btn-sm">
          <MailIcon className="h-4 w-4" /> Email
        </a>
      )}
    </div>
  );
}

export function KeyValue({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-2 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[9rem_1fr] gap-3">
          <dt className="text-ink-soft">{k}</dt>
          <dd className="min-w-0 break-words">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

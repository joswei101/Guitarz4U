import { Field, Select } from "./Field";
import { CONTACT_METHODS } from "@/lib/constants";

export type ContactDefaults = { name?: string | null; phone?: string | null; email?: string | null; preferred?: string | null };

export function ContactFields({ defaults, errors = {} }: { defaults: ContactDefaults; errors?: Record<string, string> }) {
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className="mb-2 font-display text-lg">Your contact details</legend>
      <Field label="Full name" name="contact_name" required autoComplete="name" defaultValue={defaults.name ?? ""} error={errors.contact_name} maxLength={120} />
      <Select
        label="Preferred contact method"
        name="preferred_contact"
        options={CONTACT_METHODS}
        defaultValue={defaults.preferred ?? "whatsapp"}
        error={errors.preferred_contact}
      />
      <Field
        label="Phone / WhatsApp number"
        name="contact_phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        defaultValue={defaults.phone ?? ""}
        error={errors.contact_phone}
        hint="e.g. 082 123 4567"
        maxLength={20}
      />
      <Field
        label="Email address"
        name="contact_email"
        type="email"
        autoComplete="email"
        defaultValue={defaults.email ?? ""}
        error={errors.contact_email}
        maxLength={200}
      />
    </fieldset>
  );
}
